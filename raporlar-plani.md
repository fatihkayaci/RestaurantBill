# Raporlar Sayfası — Uygulama Planı

> Bu doküman `gun-sonu-plani.md` ile birlikte okunmalı. İki iş bazı yerlerde aynı
> altyapıyı paylaşıyor (`Branch.DayEndTime`, `Payment.UserId`, `Payment.ShiftId`).

---

## Uygulama Durumu — Tamamlandı (Adım 8 hariç)

**Yapıldı** (`feat/shift-payment-user-tracking` branch'i): Adım 0 + tüm sekmeler (§5.1-5.6).

- `IBusinessDayResolver` / `BusinessDayResolver` — şube bazlı iş günü ↔ UTC aralık çevrimi.
- `IReportScopeResolver` / `ReportScopeResolver` — Admin tek şube, Owner tüm/tek şube (sahiplik doğrulamalı).
- `ReportsController`: `GET /api/reports/{sales,shifts,products,staff,discounts,tax}`.
- Frontend: `pages/reports/ReportsPage.tsx` (ortak filtre çubuğu: tarih presetleri + özel
  aralık + Owner'da şube seçici, 6 sekme) + `useReportTabData` hook'u (her sekme aktifken
  lazy çeker, aynı filtre için tekrar sekmeye dönülünce yeniden istek atmaz).
  - `SalesTab` — ciro/matrah/KDV, saatlik/günlük grafik, ödeme yöntemi kırılımı, gün×saat
    heatmap, Owner'da şube karşılaştırması.
  - `ShiftsTab` — eski `ShiftsPage`'in yerini aldı: özet kartlar + vardiya tablosu + tüm
    aksiyonlar, Owner'da şube bazlı özet.
  - `ProductsTab` — en çok satan (adet/ciro toggle), kategori kırılımı, hiç satmayan aktif
    ürünler, indirim-düzeltmeli ortalama birim fiyat.
  - `StaffTab` — garson bazlı (Order.CreatedUser) ve kasiyer bazlı (Payment.UserId) iki ayrı tablo.
  - `DiscountsTab` — kullanıcı bazlı indirim, oran dağılımı (0-10/10-25/25-50/50-100
    kovaları), not doldurulma oranı, iptal edilen siparişler (AuditLog'dan kim/ne zaman).
  - `TaxTab` — KDV oranı bazlı Matrah/KDV/Toplam dökümü.
- `Payment(CashRegisterId, CreatedAt)` ve `Shift(BranchId, OpenedAt)` composite indeksleri.

**Yol boyunca çıkan ve çözülen iki yan sorun:**

- Dev DB'de `Branch.TimeZoneId`'nin eski migration'dan boş (`""`) kalan satırları
  `BackfillBranchTimeZoneId` migration'ıyla `Europe/Istanbul`'a dolduruldu;
  `BusinessDayResolver`'a `DayEndCloseService`'teki gibi geçersiz saat dilimi → UTC
  fallback'i eklendi.
- **Mimari bulgu — `OrderItem` ödendiğinde silinir:** `Order.SettleItem()` bir kalem
  tamamen ödendiğinde `OrderItem`'ı koleksiyondan kaldırıyor; `OrderId` zorunlu FK olduğu
  için EF Core bunu veritabanından fiziksel olarak siliyor. Yani Ürünler sekmesi için
  geçmişe dönük ürün/kategori satışı `OrderItem`'dan hesaplanamaz. Kullanıcı kararıyla
  düzgün çözüldü: yeni bir `PaymentLineItem` tablosu (`AddPaymentLineItem` migration)
  eklendi — `CreatePaymentCommandHandler` artık her ödeme grubunda ürün/kategori adını
  **anlık görüntü (snapshot)** olarak kalıcı satır halinde yazıyor, `OrderItem` silme
  davranışına dokunulmadı. **Not:** Bu tablo yalnızca bu değişiklikten sonraki ödemeleri
  kapsıyor — geçmiş ödemeler için backfill yapılmadı (Payment.ShiftId'deki "geriye dönük
  doldurulmadı" kararıyla aynı mantık), Ürünler sekmesi eski tarih aralıklarında boş dönebilir.

**Yapılmadı / sonraki oturuma kaldı:**

- Adım 8 temizliği: `GetOverviewStatsQueryHandler`'ın `Payment` kaynağına geçirilmesi
  (karar verildi: OverViewPage kalacak ama henüz uygulanmadı) ve tüm-zamanlar yerine
  tarih filtresi eklenmesi.
- Excel/PDF çıktısı — kullanıcı kararıyla bu plana hiç girmeyecek, DTO'lar düz tablo
  yapıda bırakıldı ki istenirse sonradan eklenebilsin.

---

## 0. Alınan Kararlar

| Konu | Karar |
|---|---|
| Kim erişecek? | **Admin** kendi şubesi + kasa/vardiya operasyonu. **Owner** tüm şubeler, şube kırılımıyla. |
| Owner gün sonu görecek mi? | Hayır. Vardiya detayı Admin'de. Owner sadece **özet** (toplam fark, sayım bekleyen sayısı). |
| Ciro nasıl gösterilecek? | **İki ayrı satır**: KDV dahil tahsilat + matrah. KDV üçüncü satır. |
| Sekmeler | Hepsi yapılacak. Öncelik: **Satış** ve **Kasa & Vardiya**. |
| Excel çıktısı | *Karar bekliyor* — aşağıdaki açık sorulara bak. |

---

## 1. Mevcut Durum

| Endpoint | Kapsam | Sorun |
|---|---|---|
| `GET /stats/overview` | Şube, **tarih filtresi yok, tüm zamanlar** | `Order.TotalPrice` kullanıyor; iptal filtresi yok |
| `GET /stats/owner-dashboard` | Çok şube, tarih + trend | Sadece Owner; `Payment.TotalAmount` kullanıyor |

Sayfalar: `pages/shared/OverViewPage.tsx`, `pages/owner/DashboardPage.tsx`,
`pages/admin/ShiftsPage.tsx`.

---

## 2. Düzeltilmesi Gereken Üç Temel Sorun

### 2.1 Ciro Kaynağı Tutarsız

```csharp
// GetOverviewStatsQueryHandler
decimal totalRevenue = orders.Sum(o => o.TotalPrice);

// GetOwnerDashboardQueryHandler
// Payment.TotalAmount üzerinden
```

Bu ikisi asla aynı sayıyı vermez:

- `Order.TotalPrice` indirim **öncesi** tutar.
- `GetOverviewStatsQueryHandler`'da `Status` filtresi yok — **iptal edilen siparişler de sayılıyor**.
- Kısmi ödemeler ve KDV oranına göre bölünen ödemeler `Order` seviyesinde görünmüyor.

**Karar: `Payment` tek doğruluk kaynağıdır.** Gerçekten tahsil edilmiş parayı temsil
ediyor ve `Matrah`, `TaxAmount`, `Discount` alanları onda. Tüm rapor sorguları
`Payment` üzerinden yazılacak. `GetOverviewStatsQueryHandler` de bu kaynağa geçirilecek
(yoksa "Genel Bakış" ile "Raporlar" farklı sayı gösterir).

### 2.2 İş Günü ≠ Takvim Günü

Gece 01:30'da kapanan masanın satışı hangi güne yazılacak?

`Branch.DayEndTime` (gün sonu planı, Adım 3) eklendiğinde raporlar da **iş gününe** göre
gruplanmalı. Aksi halde gün sonu Z raporundaki toplam ile Raporlar sayfasındaki günlük
ciro tutmaz — bu, açıklaması en zor bug türü.

Ortak yardımcı gerekiyor:

```csharp
public interface IBusinessDayResolver
{
    // Şubenin TimeZoneId + DayEndTime'ına göre takvim aralığını UTC aralığına çevirir
    (DateTime FromUtc, DateTime ToUtc) ToUtcRange(Branch branch, DateOnly from, DateOnly to);

    // Bir UTC anının hangi iş gününe ait olduğunu döndürür
    DateOnly ResolveBusinessDay(Branch branch, DateTime utcMoment);
}
```

**Çok şubeli Owner sorgusunda dikkat:** Şube A `00:00`, şube B `04:00` ise "1 Eylül
cirosu" iki şube için farklı UTC aralığına denk gelir. Tek bir `BETWEEN` yetmez:

```csharp
// Şube başına aralık hesapla, OR'lu predicate kur
var ranges = branches.ToDictionary(b => b.Id, b => resolver.ToUtcRange(b, from, to));

query = query.Where(p => ranges.Any(r =>
    p.Order.Table.Region.BranchId == r.Key &&
    p.CreatedAt >= r.Value.FromUtc && p.CreatedAt < r.Value.ToUtc));
```

EF Core bunu doğrudan çeviremez; pratikte şube başına `Union` ya da raw SQL / önceden
hesaplanmış `(BranchId, FromUtc, ToUtc)` tablosuna `JOIN` gerekir. **Baştan böyle
kurulursa maliyeti yok; sonradan fark edilirse tüm rapor sorguları elden geçer.**

> Basitleştirme seçeneği: Tüm şubeler aynı `DayEndTime`'a sahipse tek aralık kullan,
> farklıysa şube başına hesapla. Kod tek yerde (`IBusinessDayResolver`) kalır.

### 2.3 Performans

`GetOverviewStatsQueryHandler` şubenin **tüm** siparişlerini belleğe çekiyor:

```csharp
List<Order> orders = await _db.Orders
    .Include(o => o.OrderItems).ThenInclude(i => i.Product)
    .Where(o => o.Table.Region.BranchId == restaurantId)
    .ToListAsync(cancellationToken);   // <-- tüm geçmiş
```

500 siparişte sorun değil, 50.000'de sayfa açılmaz. Rapor sorguları bunu katlar.

**Kural: `GroupBy` `IQueryable` üzerinde yapılacak, `ToListAsync` en sonda olacak.**
Agregasyon SQL'e itilecek, `.NET` tarafında `List<Payment>` üzerinde `GroupBy`
yapılmayacak.

Gereken indeksler:

```
Payment (CashRegisterId, CreatedAt)
Payment (ShiftId)
Payment (UserId)
Shift   (CashRegisterId, Status)
Shift   (BranchId, OpenedAt)
```

---

## 3. Doğrulanması Gereken: `TotalAmount == Matrah + TaxAmount`?

`CreatePaymentCommandHandler` içinde `groupNetTotal`, `groupMatrah`, `groupTaxAmount`
ayrı ayrı hesaplanıyor. İndirim uygulandığında matrahın da indirimli hesaplanıp
hesaplanmadığı doğrulanmalı.

Tutmuyorsa raporda **"Matrah + KDV ≠ Ciro"** çıkar ve muhasebe kabul etmez.

Kontrol sorgusu:

```sql
SELECT COUNT(*) FROM "Payments"
WHERE ROUND("TotalAmount", 2) <> ROUND("Matrah" + "TaxAmount", 2);
```

Sıfır dönmüyorsa önce bu düzeltilmeli, rapor sonra.

---

## 4. Sayfa Yapısı

Tek sayfa, sekmeli. Üstte **ortak filtre çubuğu**:

- Tarih aralığı: `Bugün` / `Dün` / `Bu hafta` / `Bu ay` / `Özel aralık`
- Şube seçici — **sadece Owner'da görünür** (`Tümü` + tek tek şubeler)
- Yenile butonu + son güncelleme zamanı

Sekmeler:

| Sekme | Admin | Owner | Öncelik |
|---|:-:|:-:|:-:|
| Satış | ✓ | ✓ (şube kırılımlı) | **1** |
| Kasa & Vardiya | ✓ (tam) | ✓ (sadece özet) | **1** |
| Ürünler | ✓ | ✓ | 2 |
| Personel | ✓ | ✓ | 2 |
| İndirim & İptal | ✓ | ✓ | 3 |
| Mali (KDV) | ✓ | ✓ | 3 |

---

## 5. Sekme İçerikleri

### 5.1 Satış (Öncelik 1)

**Üst kartlar — ciro üç satır halinde:**

```
┌─────────────────────────┐  ┌──────────────┐  ┌──────────────┐
│ Ciro (KDV Dahil)        │  │ İşlem Sayısı │  │ Ort. Sepet   │
│ ₺51.540,00              │  │ 114          │  │ ₺452,10      │
│ ─────────────────────── │  └──────────────┘  └──────────────┘
│ Matrah      ₺46.854,55  │
│ KDV          ₺4.685,45  │
└─────────────────────────┘
```

**Grafik:** Aralık tek günse **saatlik bar**, çok günse **günlük çizgi**.
Owner'da şube başına ayrı seri (`DashboardPage`'deki `branchSeries` mantığı yeniden
kullanılabilir).

**Ödeme yöntemi kırılımı:** Nakit / Kart / QR — tutar + yüzde + işlem adedi.

**Saatlik yoğunluk:** Gün × saat heatmap. Vardiya planlaması için en değerli görsel;
"salı 14:00-16:00 arası boş" gibi çıkarımlar buradan geliyor.

**Owner'da ek:** Şube karşılaştırma tablosu (ciro, işlem, ort. sepet, değişim %).
`BranchPerformanceRow` DTO'su büyük ölçüde yeniden kullanılabilir.

### 5.2 Kasa & Vardiya (Öncelik 1)

> Bu sekme mevcut `pages/admin/ShiftsPage.tsx`'in yerini alır. Ayrı sayfa tutmaya gerek yok.
> Gün sonu planındaki **Adım 4** ile aynı iştir.

**Admin görünümü — üst özet:**

```
Toplam Fark    Sayım Bekleyen    Otomatik Kapanan    Onay Bekleyen
  −₺340,00           2                  5                 1
```

**Vardiya tablosu:**

| Kasa | Açılış | Kapanış | Açan | Kapatan | Beklenen | Sayılan | Fark | Durum |
|---|---|---|---|---|---|---|---|---|

Durum rozetleri: `Açık` / `Otomatik kapandı` / `Sayım bekliyor` / `Onay bekliyor` / `Onaylandı` / `Reddedildi`

**Satır tıklanınca → Z raporu detayı:**
- Ödeme yöntemi kırılımı (Nakit / Kart / QR)
- Ciro + matrah + KDV
- Kasada olması gereken nakit vs sayılan
- Kasiyer bazlı tahsilat kırılımı *(Adım 1'e bağlı)*
- İşlem listesi

**Aksiyonlar:** `Sayım Gir` (`NotCounted` vardiyalar için), `Farkı Onayla` / `Reddet`.

**Owner görünümü — sadece özet:**

| Şube | Vardiya Sayısı | Toplam Fark | Sayım Bekleyen | Otomatik Kapanan |
|---|---|---|---|---|

Satır tıklanabilir değil. Owner anormallik görürse ilgili şubenin Admin'ine iner.

> **Neden Owner'a fark gösteriyoruz:** "Gün sonu bazında görmesin" kararı Z raporu
> detayı içindi. Kasa farkı işletme sahibini birinci derecede ilgilendirir —
> suistimal takibinin tek göstergesi bu.

### 5.3 Ürünler (Öncelik 2)

- En çok satan — **adet ve ciro ayrı sıralanabilir**
- Kategori bazlı kırılım (pasta grafik + tablo)
- **Hiç satmayan ürünler** — menü temizliği için
- Ürün bazlı ortalama birim fiyat (indirim etkisini gösterir)

> **`TopProductDto`'ya `Revenue` eklenmeli.** Şu an sadece `Sold` (adet) var.
> "En çok satan çay, en çok kazandıran ızgara" — işletme için ikincisi daha değerli.

```csharp
public class TopProductDto
{
    public string Name { get; set; } = string.Empty;
    public int Sold { get; set; }
    public decimal Revenue { get; set; }      // YENİ
    public string CategoryName { get; set; } = string.Empty;  // YENİ
}
```

### 5.4 Personel (Öncelik 2)

İki ayrı tablo — karıştırılmamalı:

**Garson bazlı** (`Order.CreatedUser`): açtığı sipariş sayısı, toplam ciro, ortalama sepet.

**Kasiyer bazlı** (`Payment.UserId`): tahsil ettiği tutar, işlem sayısı, yöntem kırılımı.

> ⚠ **Bağımlılık:** Kasiyer tablosu gün sonu planındaki **Adım 1**'e (`Payment.UserId`)
> bağlı. O yapılmadan sadece garson tablosu gösterilebilir.

### 5.5 İndirim & İptal (Öncelik 3)

Genelde atlanır ama **suistimal takibinin tek yeri burası.**

- Kullanıcı bazlı toplam indirim tutarı ve adedi
- İndirim oranı dağılımı (%10 normal, %100 şüpheli)
- `DiscountNote` doldurulmuş/boş oranı
- İptal edilen siparişler: kim, ne zaman, tutar
- Ciroya oranı: `toplam indirim / brüt ciro`

Alanlar zaten var: `Payment.Discount`, `DiscountPercent`, `DiscountNote`, `Order.Status`.

### 5.6 Mali / KDV (Öncelik 3)

Oran bazlı tablo — muhasebeye verilecek format:

| KDV Oranı | Matrah | KDV | Toplam |
|---|---|---|---|
| %1 | ₺12.400,00 | ₺124,00 | ₺12.524,00 |
| %10 | ₺28.000,00 | ₺2.800,00 | ₺30.800,00 |
| %20 | ₺6.454,55 | ₺1.290,91 | ₺7.745,46 |

> `Payment` satırları zaten KDV oranına göre bölünüyor (`CreatePaymentCommandHandler`
> bunu yapıyor), yani bu tablo doğrudan `GroupBy(TaxRate)` ile çıkar.

---

## 6. Backend Tasarımı

### 6.1 Controller

```csharp
[Authorize(Roles = "Owner,Admin")]
[Route("api/reports")]
public class ReportsController : BaseController
{
    [HttpGet("sales")]      // GetSalesReportQuery
    [HttpGet("shifts")]     // GetShiftReportQuery
    [HttpGet("products")]   // GetProductReportQuery
    [HttpGet("staff")]      // GetStaffReportQuery
    [HttpGet("discounts")]  // GetDiscountReportQuery
    [HttpGet("tax")]        // GetTaxReportQuery
}
```

### 6.2 Ortak Filtre

```csharp
public class ReportFilter
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public Guid? BranchId { get; set; }   // null = kapsam kuralına göre çözülür
}
```

### 6.3 Yetki Çözümü — Tek Yerde

Her handler'da tekrar yazılmamalı:

```csharp
public interface IReportScopeResolver
{
    // Admin  -> daima kendi BranchId'si, filtredeki BranchId yok sayılır
    // Owner  -> BranchId verilmişse o şube (sahipliği doğrulanır), yoksa tüm şubeleri
    Task<List<Branch>> ResolveAsync(Guid? requestedBranchId, CancellationToken ct);
}
```

**Güvenlik notu:** Owner bir `BranchId` gönderdiğinde o şubenin gerçekten kendisine ait
olduğu doğrulanmalı. Aksi halde başka bir işletmenin cirosu okunabilir.

### 6.4 Sorgu Deseni

```csharp
List<Branch> branches = await _scope.ResolveAsync(request.Filter.BranchId, ct);
var ranges = branches.ToDictionary(b => b.Id, b => _businessDay.ToUtcRange(b, from, to));

// Agregasyon SQL'de kalmalı
var rows = await _db.Payments
    .Where(/* şube + iş günü aralığı predicate'i */)
    .GroupBy(p => new { p.PaymentMethod })
    .Select(g => new {
        g.Key.PaymentMethod,
        Count  = g.Count(),
        Total  = g.Sum(p => p.TotalAmount),
        Matrah = g.Sum(p => p.Matrah),
        Tax    = g.Sum(p => p.TaxAmount)
    })
    .ToListAsync(ct);
```

---

## 7. Frontend Tasarımı

```
frontend/src/
├── pages/reports/
│   ├── ReportsPage.tsx              # sekme kabuğu + ortak filtre çubuğu
│   └── tabs/
│       ├── SalesTab.tsx
│       ├── ShiftsTab.tsx
│       ├── ProductsTab.tsx
│       ├── StaffTab.tsx
│       ├── DiscountsTab.tsx
│       └── TaxTab.tsx
└── features/reports/
    ├── api/reportService.ts
    ├── types/index.ts
    └── hooks/useReportFilter.ts     # tarih + şube state'i, URL query'ye yazar
```

**Notlar:**

- Filtre state'i **URL query string'inde** tutulmalı (`?from=&to=&branch=&tab=`) — rapor
  linki paylaşılabilir ve sayfa yenilenince kaybolmaz.
- Sekme değişince tüm veri yeniden çekilmemeli; her sekme kendi verisini **lazy** çeker
  ve filtre değişmedikçe cache'ler.
- Grafikler `recharts` — projede zaten kullanılıyor (`DashboardPage`, `OverViewPage`).
- Para formatı için mevcut `formatCurrency` yardımcısı yeniden kullanılmalı.

---

## 8. Uygulama Sırası

```
0. Ön koşullar
   ├── Branch.DayEndTime + TimeZoneId        (gün sonu planı Adım 3)
   ├── IBusinessDayResolver
   ├── IReportScopeResolver
   └── TotalAmount = Matrah + TaxAmount doğrulaması

1. ReportsController iskeleti + ortak filtre + frontend kabuk

2. Satış sekmesi          ← öncelik
3. Kasa & Vardiya sekmesi ← öncelik  (gün sonu planı Adım 4 ile birleşir)

4. Ürünler sekmesi        (TopProductDto'ya Revenue + CategoryName)
5. Personel sekmesi       (Payment.UserId'ye bağlı — gün sonu planı Adım 1)

6. İndirim & İptal sekmesi
7. Mali / KDV sekmesi

8. Temizlik
   ├── GetOverviewStatsQueryHandler'ı Payment kaynağına geçir
   └── Tüm zamanlar yerine tarih filtresi ekle
```

---

## 9. Test Edilecek Senaryolar

1. Gün sonu Z raporundaki toplam ile Raporlar → Satış sekmesindeki aynı günün cirosu **birebir aynı** çıkmalı.
2. Gece 01:30'daki satış, `DayEndTime = 04:00` olan şubede bir önceki güne yazılmalı.
3. Admin başka şubenin `branchId`'sini gönderirse kendi şubesinin verisini almalı (yetki sızıntısı yok).
4. Owner başka işletmenin `branchId`'sini gönderirse **hata almalı**.
5. İptal edilen sipariş ciroya girmemeli.
6. İndirimli ödemede Matrah + KDV = Ciro tutmalı.
7. Kısmi ödemeli masa (2 ayrı çekim) tek sipariş olarak sayılmalı, ciro iki çekimin toplamı olmalı.
8. Farklı `DayEndTime`'lı iki şube Owner raporunda doğru gruplanmalı.
9. Boş tarih aralığında sayfa hata vermemeli, sıfır göstermeli.
10. 90 günlük aralıkta sorgu kabul edilebilir sürede dönmeli (agregasyon SQL'de mi kontrol et).

---

## 10. Açık Sorular — Kararlar

- [x] **Excel / PDF çıktısı** — **Sonraya bırakıldı.** DTO'lar yine de düz tablo yapıda
      tasarlandı ki istenirse sonradan eklenmesi zahmetsiz olsun.
- [x] **Owner'ın Kasa & Vardiya özeti** — Planda önerildiği gibi uygulandı: şube bazlı
      özet tablo (vardiya sayısı, toplam fark, sayım bekleyen, otomatik kapanan),
      satır tıklanamaz. Owner tek bir şube seçtiğinde Admin'deki tam liste görünümüne döner.
- [x] **`GetOverviewStatsQueryHandler` / `OverViewPage`** — **Korunacak**, Payment
      kaynağına geçirilecek (Adım 8). Bu oturumda henüz uygulanmadı, sonraki oturuma kaldı.
- [x] **Rapor verisi** — **Canlı hesap.** Snapshot tablo (`DailySalesSummary`) eklenmedi;
      veri büyüdüğünde ayrı bir iş olarak ele alınabilir.
- [x] **Saatlik yoğunluk heatmap'i** — **İlk sürüme dahil edildi** (Satış sekmesi, gün×saat ızgarası).
