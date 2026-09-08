# Gün Sonu / Vardiya Yapısı — Uygulama Planı

Bu doküman, gün sonu (Z raporu) akışını kasiyer tarafından çıkarıp **kasa bazlı** hale
getirmek, admin tarafına açmak ve şube bazlı otomatik kapanış eklemek için gereken
değişiklikleri sıralar.

---

## Uygulama Durumu — Tamamlandı

Adım 1-4'ün tamamı `feat/shift-payment-user-tracking` branch'inde uygulandı. Sapmalar ve
kararlar için aşağıdaki "Açık Sorular" bölümüne bakın; en önemlisi Adım 3.3'teki "tek
sayım iki vardiyaya birden uygulanır" tasarımı yerine daha basit ve zamana dayanıksız
(timing-independent) bir mekanizma seçildi — detay ilgili maddede.

---

## 0. Alınan Kararlar

| Konu | Karar |
|---|---|
| Vardiya kime ait? | **Kasaya.** Bir kasada aynı anda tek vardiya. Admin de kasiyer de aynı vardiyaya ödeme yazar. |
| Kim ödeme aldı? | `Payment` üzerinde tutulacak (şu an hiç tutulmuyor). |
| Gün sonu saati | **Şube bazlı ayarlanabilir.** Varsayılan `00:00`. |
| Otomatik kapanış | Şubenin gün sonu saatinde job kapatır. Admin elle de kapatabilir. |
| Sayım | Otomatik kapanışta sayım yok; vardiya "sayılmadı" durumunda kapanır, sonradan sayım girilir. |
| Kart/QR | Kasa bakiyesine **girmez**, sadece gün sonu raporunda gösterilir. |

---

## 1. Kritik Tasarım Notu: Kasa = Nakit

`CreatePaymentCommandHandler` şu an doğru davranıyor:

```csharp
if (request.PaymentMethod == PaymentMethod.Nakit)
{
    CashTransaction transaction = register.AddTransaction(CashTransactionType.In, netTotal, _currentUserService.UserId);
    _db.CashTransactions.Add(transaction);
}
```

Kart ve QR çekmeceye para koymaz, bankaya/POS'a gider. **Bu mantık değişmeyecek.**
`CashRegister.Balance` sadece fiziksel nakti temsil eder, aksi halde sayım hiçbir zaman tutmaz.

"Kartları da gün sonuna ekleyelim" ihtiyacı, `ShiftSummaryDto.Breakdown` ile zaten
karşılanıyor (yöntem bazlı kırılım: Nakit / Kart / QR). Eksik olan bunun **admin
tarafında gösterilmemesi**. Yani bu iş görünenden küçük — yeni bir hesaplama değil,
mevcut veriyi yeni bir ekrana bağlamak.

Gün sonu ekranında iki ayrı kavram net ayrılmalı:

- **Ciro** = Nakit + Kart + QR (o günün toplam satışı)
- **Kasada olması gereken nakit** = Açılış + nakit satışlar + nakit girişler − nakit çıkışlar

Sayım sadece ikincisiyle karşılaştırılır.

---

## 2. Mevcut Durum Envanteri

### Backend

| Dosya | Durum |
|---|---|
| `Domain/Entities/Shift.cs` | `Create`, `Close`, `ApproveOpeningDifference`, `RejectOpeningDifference`, `LinkOpeningAdjustmentTransaction` var |
| `Domain/Enums/ShiftStatus.cs` | `Open`, `Closed` |
| `Domain/Enums/PaymentMethod.cs` | `Kart = 1`, `Nakit = 2`, `Qr = 3` |
| `Features/Shifts/Commands/OpenShift/` | `OpeningBalance` client'tan geliyor, fark varsa `ApplyShiftDifference` |
| `Features/Shifts/Commands/CloseShift/` | Sayılan tutar zorunlu |
| `Features/Shifts/Queries/GetMyCurrentShift*` | **Kişi bazlı**: `s.OpenedByUserId == _currentUser.UserId` |
| `Features/Shifts/Queries/GetCurrentShift` | Kasa bazlı, zaten var |
| `Infrastructure/Services/RefreshTokenCleanupService.cs` | `BackgroundService` + `PeriodicTimer` deseni — job için örnek |

### Frontend

| Dosya | Durum |
|---|---|
| `pages/cashier/components/ShiftStartGate.tsx` | Kasa seç → say → aç |
| `pages/cashier/components/EndShiftModal.tsx` | Özet + sayım + Z raporu görünümü |
| `pages/cashier/components/PaymentPanel.tsx` | `cashRegisterMode: 'shift' \| 'select'` |
| `pages/admin/ShiftsPage.tsx` | Vardiya listesi + fark onay/ret |
| `pages/admin/CashRegistersPage.tsx` | Kasa CRUD + giriş/çıkış/aktarım |

### Tespit Edilen Boşluklar

1. **`Payment`'ta kullanıcı yok.** `ShiftTransactionDto.CreatedByUserName` aslında
   `Order.CreatedUser`'dan geliyor — yani siparişi açan garson, ödemeyi alan kişi değil.
2. **Vardiya sorguları zaman aralığı bazlı**: `p.CreatedAt >= shift.OpenedAt`. Vardiya
   sınırları netleşince (otomatik kapanış) bu kırılgan hale gelir.
3. **Kapanmış vardiyanın raporu görüntülenemiyor.** `my-current-summary` sadece açık
   vardiya için çalışıyor.
4. **`OpenShiftCommand`'da `OpeningBalance` client'tan geliyor** — admin tarafına aynı
   endpoint verilirse istemci istediği açılış bakiyesini gönderebilir.

> **Kontrol edilecek:** `20260811133859_AddShiftLinkedClosingShift` migration'ında
> `Shift.LinkedClosingShiftId` alanı görünüyor ama entity'nin güncel halinde yok gibi.
> Varsa Adım 3'te "önceki vardiya ↔ sonraki vardiya" bağı için kullanılabilir.

---

## Adım 1 — `Payment`'a `UserId` ve `ShiftId`

**Neden ilk:** Diğer her şey buna dayanıyor. "Kim aldı" bilgisi ve vardiya bazlı kesin
sorgu olmadan gün sonu raporu tahminî kalır.

### 1.1 Domain

`Payment` entity'sine iki alan:

```csharp
public Guid UserId { get; private set; }     // ödemeyi alan
public Guid ShiftId { get; private set; }    // hangi vardiyaya yazıldı
```

`Payment.Create(...)` imzasına eklenecek. Mevcut çağrı:

```csharp
Payment.Create(order.Id, register.Id, groupNetTotal, groupMatrah, groupTaxAmount,
               request.PaymentMethod, groupItemCount, groupDiscount,
               request.DiscountPercent, request.DiscountNote);
```

Yeni parametreler **sona** eklenmeli, mevcut sıra bozulmamalı.

### 1.2 CreatePaymentCommandHandler

Ödeme alınmadan önce kasanın açık vardiyası bulunmalı:

```csharp
Shift? shift = await _db.Shifts
    .FirstOrDefaultAsync(s => s.CashRegisterId == register.Id && s.Status == ShiftStatus.Open, ct);
if (shift is null)
    return Result<bool>.Failure("Bu kasada açık bir gün yok, önce günü başlatın.");
```

Sonra her `Payment.Create` çağrısına `_currentUserService.UserId` ve `shift.Id` geçilir.

### 1.3 Migration

```bash
dotnet ef migrations add AddPaymentUserAndShift -p Backend/RestaurantBill.Persistence -s Backend/RestaurantBill.WebAPI
```

**Mevcut kayıtlar için:** `ShiftId` non-nullable yapılırsa eski `Payment` satırları
patlar. İki seçenek:

- `Guid?` olarak ekle, yeni kayıtlar dolu gelsin, sorgularda `p.ShiftId == shift.Id || (p.ShiftId == null && p.CreatedAt >= shift.OpenedAt)` fallback'i kullan.
- Ya da migration içinde `UPDATE` ile eski ödemeleri zaman aralığına göre vardiyalara eşle.

Prod'da veri varsa **birinci seçenek** daha güvenli.

### 1.4 Sorguları Geçir

`GetMyCurrentShiftSummaryQueryHandler` ve `GetMyCurrentShiftTransactionsQueryHandler`
içindeki `p.CreatedAt >= shift.OpenedAt` filtresi `p.ShiftId == shift.Id` olur.

`ShiftTransactionDto`'ya ödemeyi alan da eklenir:

```csharp
public string PaidByUserName { get; set; } = string.Empty;  // ödemeyi alan
public string CreatedByUserName { get; set; } = string.Empty; // siparişi açan (mevcut)
```

**Bittiğinde:** Kim ne kadar ödeme aldı sorgulanabilir; vardiya sınırları kesinleşir.

---

## Adım 2 — Vardiya = Kasa, Admin Tarafında "Gün Başlat"

### 2.1 Yeni Komut: `EnsureShiftOpenCommand`

`OpenShiftCommand`'a dokunulmaz (kasiyerin sayımlı akışı orada kalır). Yeni komut:

```csharp
public class EnsureShiftOpenCommand : IRequest<Result<ShiftDto>>
{
    public Guid CashRegisterId { get; set; }
}
```

Handler mantığı:

1. Kasa var mı, `Status == Open` mı?
2. Kasada açık vardiya varsa → onu döndür, hiçbir şey yapma.
3. Yoksa → `OpeningBalance = register.Balance` ile aç. `OpeningDifference = 0`,
   sayım ekranı yok, kasa bakiyesine dokunulmaz.
4. Audit log: `"ShiftAutoOpened"` — `{kullanıcı} {kasa} kasasında günü başlattı (sayımsız)`.

**Kritik:** `OpeningBalance` client'tan **alınmaz**, sunucu `register.Balance`'tan okur.

Endpoint:

```csharp
[Authorize(Roles = "Owner,Admin,Cashier")]
[HttpPost("ensure-open")]
public async Task<IActionResult> EnsureOpen([FromBody] EnsureShiftOpenCommand command, CancellationToken ct)
```

### 2.2 Sorguları Kişi Bazlıdan Kasa Bazlına Geçir

`GetMyCurrentShift*` sorguları `s.OpenedByUserId == _currentUser.UserId` filtresini
kullanıyor. Admin araya girince bu model kırılıyor.

Yeni yaklaşım: sorgular **`cashRegisterId` parametresi** alsın.

- `GetShiftSummaryQuery { Guid ShiftId }`
- `GetShiftTransactionsQuery { Guid ShiftId }`
- `GetCurrentShiftQuery { Guid CashRegisterId }` — zaten var

Frontend seçili kasayı bilir (aşağıya bak), bu id'yi gönderir.

Eski `my-current*` endpoint'leri kırılmamak için bırakılabilir ama yeni ekranlar
kullanmamalı. Temizlik Adım 4'ün sonuna.

### 2.3 `start-candidates` Değişikliği

Şu an "vardiyası başlamamış kasalar" dönüyor. Admin bir kasayı otomatik açtıysa kasiyer
o kasayı hiç göremez ve ödeme alamaz.

Yeni DTO:

```csharp
public class ShiftStartCandidateDto
{
    public Guid CashRegisterId { get; set; }
    public string CashRegisterName { get; set; } = string.Empty;
    public decimal ExpectedOpeningBalance { get; set; }
    public bool HasOpenShift { get; set; }        // YENİ
    public Guid? OpenShiftId { get; set; }        // YENİ
    public DateTime? OpenedAt { get; set; }       // YENİ
    public bool PreviousShiftUncounted { get; set; } // YENİ — Adım 3
}
```

Tüm açık kasalar döner.

### 2.4 Frontend — Kasiyer (`ShiftStartGate`)

- Kasa listesinde her kasa için durum rozetleri: *Gün açık* / *Kapalı* / *Sayım bekliyor*
- Açık vardiyalı kasa seçilirse → sayım ekranı **atlanır**, direkt o vardiyaya girilir
- Kapalı kasa seçilirse → mevcut sayım akışı aynen çalışır
- Seçilen `cashRegisterId` `localStorage`'a yazılır (sayfa yenilemede tekrar sorulmasın)

### 2.5 Frontend — Admin (`PaymentPanel` `select` modu)

Kasa seçildiğinde:

```ts
const shift = await shiftService.ensureOpen(cashRegisterId);
setActiveShift(shift);
```

Kasa açık değilse (`CashRegisterStatus != Open`) buton pasif, "Bu kasa kapalı" uyarısı.

Admin panelde ayrıca **"Gün Başlat"** butonu (`CashRegistersPage` veya yeni bir
"Gün Sonu" sayfası) — aynı endpoint'i çağırır, ödeme almadan da günü açabilsin.

**Bittiğinde:** Admin kasa seçince gün otomatik başlar, kasiyerle çakışmaz, ödemeler
tek vardiyada toplanır.

---

## Adım 3 — Şube Gün Sonu Saati + Otomatik Kapanış

### 3.1 Branch Ayarı

`Branch` entity'sine:

```csharp
public TimeOnly DayEndTime { get; private set; } = new(0, 0);   // varsayılan 00:00
public string TimeZoneId { get; private set; } = "Europe/Istanbul";
```

`TimeZoneId`'yi şimdilik şubede tutmak yerine config'te sabitlemek de olur, ama alan
maliyeti sıfır, ileride ucuza taşınır.

Admin panelde "Şube Ayarları" içine bir saat seçici.

> Gece 02:00'ye kadar açık bir restoran için `00:00` servis ortasında kesme demektir.
> Varsayılanı `00:00` bırak ama işletmenin ayarlayabileceğini UI'da belirt.

### 3.2 Shift Entity — Sayım Durumu

Yeni enum:

```csharp
public enum ShiftCountStatus
{
    Counted = 1,      // sayım yapıldı
    NotCounted = 2    // otomatik/sayımsız kapandı, sayım bekliyor
}
```

`Shift`'e:

```csharp
public ShiftCountStatus CountStatus { get; private set; } = ShiftCountStatus.Counted;
public bool ClosedBySystem { get; private set; }
```

Yeni domain metodu:

```csharp
public void CloseWithoutCount(Guid? closedByUserId, decimal expectedClosingBalance, bool bySystem)
{
    if (Status != ShiftStatus.Open)
        throw new DomainException("Bu vardiya zaten kapatılmış.");

    ClosedByUserId = closedByUserId;
    ExpectedClosingBalance = expectedClosingBalance;
    CountedClosingBalance = null;
    Difference = null;
    ClosingDifferenceReviewStatus = null;
    CountStatus = ShiftCountStatus.NotCounted;
    ClosedBySystem = bySystem;
    ClosedAt = DateTime.UtcNow;
    Status = ShiftStatus.Closed;
}
```

Sonradan sayım için:

```csharp
public void ApplyLateCount(Guid countedByUserId, decimal countedClosingBalance, string? note)
{
    if (Status != ShiftStatus.Closed)
        throw new DomainException("Sadece kapanmış bir vardiyaya sayım girilebilir.");
    if (CountStatus == ShiftCountStatus.Counted)
        throw new DomainException("Bu vardiyanın sayımı zaten yapılmış.");

    CountedClosingBalance = countedClosingBalance;
    Difference = countedClosingBalance - ExpectedClosingBalance;
    CountStatus = ShiftCountStatus.Counted;
    ClosingDifferenceReviewStatus = DifferenceReviewStatus.Pending;
    Note = note;
}
```

**Neden `Difference = null` bırakıyoruz:** Sayılan = beklenen yazsaydık fark hep 0
çıkardı ve sistem gerçek bir kasa açığını gizlerdi.

### 3.3 Sayımın Ne Zaman Yapılacağı — Önemli

Sayımı kapanış anına bağlamanın problemi:

```
00:00  job vardiyayı kapatır, sayım yok
00:30  yeni vardiya açılır, ödemeler alınır, kasa bakiyesi değişir
10:00  admin dünkü vardiyanın sayımını girer
       → fark BUGÜNKÜ kasa bakiyesine uygulanır
       → girilen tutar dün geceki kasayı değil bugünkü kasayı yansıtır
```

**Önerilen çözüm: sayımı sonraki açılışa bağla.**

- Job vardiyayı `Closed` + `NotCounted` olarak kapatır. Yeni vardiya **otomatik açılmaz**.
- Ertesi gün kasayı ilk seçen kişiye "önceki gün sayılmadı, kasayı sayın" ekranı çıkar.
- Girilen tek tutar hem önceki vardiyanın kapanış sayımı hem yeni vardiyanın açılış
  sayımı olur — fiziksel olarak aynı para.
- Fark doğru vardiyaya yazılır, kasa tek seferde düzeltilir.
- Admin acelesi varsa "sayımı atla" der; vardiya `NotCounted` kalır, `ShiftsPage`'den
  sonradan girilebilir (farkın bugüne yazıldığı bilinerek).

Bunun için `EnsureShiftOpenCommand` ve `start-candidates` bir `PreviousShiftUncounted`
bayrağı döndürmeli.

### 3.4 Background Job

`RefreshTokenCleanupService` desenini izle, ama **24 saatlik değil dakikalık** tik:

```csharp
public class DayEndCloseService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);
    // ...
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(Interval);
        do { await RunAsync(stoppingToken); }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
```

Her tikte, açık vardiyası olan her şube için:

1. Şubenin `TimeZoneId`'sine göre yerel `now` hesapla.
2. Vardiyanın ait olduğu **iş gününü** bul: `OpenedAt` yerel saate çevrilir; saat
   `DayEndTime`'dan önceyse iş günü bir önceki gündür.
3. `now >= (iş günü + DayEndTime)` ise vardiyayı `CloseWithoutCount(null, expected, bySystem: true)`
   ile kapat.
4. Audit log + `ShiftAutoClosed`.

**Neden dakikalık:** Sabit 24 saatlik timer deploy saatine göre kayar. Dakikalık tik
hem restart'a dayanıklı hem de sunucu gece kapalıysa sabah açılınca kaçan kapanışı yakalar
(çünkü koşul "şu an tam 00:00 mı" değil, "gün sonunu geçmiş mi").

`ExpectedClosingBalance` hesabı `GetMyCurrentShiftSummaryQueryHandler`'daki
`expectedCashInRegister` mantığının aynısı — ortak bir servise (`IShiftBalanceCalculator`)
çıkarılmalı, iki yerde kopyalanmamalı.

Kayıt:

```csharp
services.AddHostedService<DayEndCloseService>();
```

### 3.5 Elle Kapatma

`ShiftsPage`'de her açık vardiya satırına **"Günü Kapat / Z Raporu Al"** butonu.
Kasiyerdeki `EndShiftModal`'ın aynısını açar; iki seçenek sunar:

- **Sayarak kapat** → mevcut `CloseShiftCommand`
- **Sayımsız kapat** → yeni `CloseShiftWithoutCountCommand`

**Bittiğinde:** Gün, şubenin belirlediği saatte kendiliğinden kapanır; kimse unutsa
bile veri tutarlı kalır.

---

## Adım 4 — Admin Gün Sonu / Z Raporu Ekranı

### 4.1 Kapanmış Vardiyanın Raporu

`GetShiftSummaryQuery { Guid ShiftId }` — açık/kapalı fark etmeksizin çalışır.
Adım 1'deki `Payment.ShiftId` sayesinde kapanmış vardiya için de doğru sonuç verir.

**Snapshot mı, canlı hesap mı?**

| | Canlı hesap | Snapshot (`ShiftReport` tablosu) |
|---|---|---|
| İş yükü | Az | Orta |
| Sonradan iptal/iade | Raporu değiştirir | Değiştirmez |
| Z raporu mantığı | Zayıf | Doğru |

Öneri: **şimdilik canlı hesap** (acil), Adım 5 olarak snapshot eklenir. Ama
`CloseShift` anında `Total`, `Breakdown`, `ExpectedClosingBalance` değerlerini bir
JSON kolona yazmak 20 satırlık iş — acilse bile atlamaya değmeyebilir.

### 4.2 Ekran İçeriği

Yeni sayfa: **Admin → Gün Sonu**

Her kasa için bir kart:

```
┌─ Kasa 1 ──────────────────── Gün açık ─┐
│ Açılış        09:14    ₺2.500,00       │
│                                         │
│ Nakit          42 işlem   ₺18.420,00   │
│ Kart           67 işlem   ₺31.180,00   │
│ QR              5 işlem    ₺1.940,00   │
│ ─────────────────────────────────────  │
│ Toplam Ciro              ₺51.540,00    │
│                                         │
│ Kasada olması gereken nakit            │
│                          ₺20.920,00    │
│                                         │
│ ⚠ 3 masa hâlâ açık                     │
│                                         │
│ [Günü Kapat]  [Detay]                  │
└─────────────────────────────────────────┘
```

**Ciro** ile **kasada olması gereken nakit** görsel olarak ayrı bloklarda olmalı —
karıştırılırsa sayım tartışması çıkar.

### 4.3 `ShiftsPage` Güncellemesi

Yeni kolon/rozetler:

- `NotCounted` vardiyalar için **"Sayım bekliyor"** rozeti + "Sayım Gir" butonu
- `ClosedBySystem` için **"Otomatik kapandı"** etiketi
- Filtre: `Sadece inceleme bekleyenler` yanına `Sayım bekleyenler`

"Sayım Gir" → `ApplyLateCountCommand` → fark oluşursa mevcut
`ApplyShiftDifference` + onay/ret akışı devreye girer.

### 4.4 Kasiyer Bazlı Kırılım (bonus)

Adım 1'deki `Payment.UserId` sayesinde neredeyse bedava:

```
Ahmet Y.    28 işlem   ₺14.200,00
Mehmet K.   19 işlem   ₺9.850,00
Admin        2 işlem     ₺870,00
```

---

## Uygulama Sırası ve Bağımlılıklar

```
Adım 1 (Payment.UserId + ShiftId)
   └─> Adım 2 (Vardiya = kasa, Gün Başlat)
          ├─> Adım 3 (Gün sonu saati + otomatik kapanış)
          └─> Adım 4 (Admin gün sonu ekranı)
```

Adım 1 + 2 bittiğinde kullanılabilir bir sürüm çıkar. Adım 3 ve 4 üstüne biner.

---

## Migration Listesi

| Adım | Migration | İçerik |
|---|---|---|
| 1 | `AddPaymentUserAndShift` | `Payment.UserId`, `Payment.ShiftId` |
| 3 | `AddBranchDayEndTimeAndShiftCountStatus` | `Branch.DayEndTime`, `Branch.TimeZoneId`, `Shift.CountStatus`, `Shift.ClosedBySystem` (EF tek diff olarak birleştirdi, iki ayrı migration'a bölünmedi) |

---

## Test Edilecek Senaryolar

1. Admin kasa seçer → gün otomatik başlar, kasa bakiyesi değişmez.
2. Admin gün başlattıktan sonra kasiyer giriş yapar → aynı vardiyaya girer, sayım istenmez.
3. Kasiyer + admin aynı vardiyada ödeme alır → gün sonu raporunda ikisi de görünür,
   kasiyer bazlı kırılım doğru.
4. Kart ödemesi alınır → `CashRegister.Balance` **değişmez**, gün sonu raporunda görünür.
5. Gün sonu saati gelir → vardiya `NotCounted` kapanır, yeni vardiya açılmaz.
6. Sunucu gece kapalı, sabah açılır → kaçan kapanış ilk tikte yakalanır.
7. ~~Ertesi gün kasa seçilir → "önceki gün sayılmadı" ekranı çıkar, tek sayım iki vardiyaya
   uygulanır.~~ **Uygulanan tasarım farklı** — bkz. Açık Sorular.
8. Sayım atlanır → vardiya `NotCounted` kalır, `ShiftsPage`'de rozet görünür.
9. Sonradan sayım girilir → fark hesaplanır, kasa düzeltilir, onay/ret akışı çalışır.
10. Kapalı kasada gün başlatılamaz.
11. Açık vardiyası olmayan kasada ödeme alınamaz (net hata mesajı).

---

## Açık Sorular — Kararlar

- [x] `Shift.LinkedClosingShiftId` alanı hâlâ var mı? — **Hayır.** `AddShiftLinkedClosingShift`
      migration'ıyla eklenmiş ama `ReworkShiftDifferenceReview` migration'ında kaldırılmış;
      güncel entity'de yok. "Önceki vardiya ↔ sonraki vardiya" bağı için kullanılamadı.
- [x] "Tek sayım iki vardiyaya birden uygulanır" mekanizması (3.3) — **Uygulanmadı, yerine
      daha basit bir tasarım seçildi.** Yeni vardiya (`EnsureShiftOpenCommand`) her zaman
      `register.Balance`'tan, sayım beklemeden açılıyor. Önceki vardiyanın sayımı ayrı ve
      bağımsız bir adım: `ApplyLateCountCommand`, farkı **mevcut kasa bakiyesine bir delta
      (düzeltme) olarak** uyguluyor (`CashRegister.ApplyShiftDifference`), tıpkı normal
      kapanıştaki gibi. Bu yüzden ne zaman girilirse girilsin doğru sonucu verir — aradan
      kaç vardiya/işlem geçmiş olursa olsun, düzeltme miktarı değişmez. Kullanıcı deneyimi
      olarak: kasiyer tarafında `ShiftStartGate`'te "⚠ önceki gün sayılmadı" bilgi notu
      çıkıyor (bloklamıyor), asıl sayım girişi admin'in Vardiyalar/Gün Sonu sayfasındaki
      "Sayım Gir" butonundan yapılıyor.
- [x] Z raporu snapshot'ı — **Sonraya bırakıldı.** Adım 4 canlı hesapla (`GetShiftSummaryQuery`,
      açık/kapalı fark etmeksizin çalışıyor) uygulandı. Sonradan iptal/iade olursa geçmiş
      bir Z raporu değişebilir; bu kabul edilen bir risk.
- [x] `TimeZoneId` — **Şube bazlı** (`Branch.TimeZoneId`), Owner/Admin panelden düzenlenebilir
      (varsayılan `Europe/Istanbul`).
- [x] Eski `Payment` kayıtları için `ShiftId` — **Geriye dönük doldurulmadı.** `null` kalıyor,
      sorgular `p.ShiftId == shift.Id || (p.ShiftId == null && p.CreatedAt aralığı)` fallback'i
      kullanıyor. İleride gerekirse ayrı bir backfill migration'ı eklenebilir.
