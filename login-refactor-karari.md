# Login Refactor — Karar Dokümanı

Bu doküman, `User` / `Restaurant` / `UserRestaurant` üçlüsüne geçiş sonrası
kimlik doğrulama akışının nasıl çalışacağını tanımlar. Kapsam **sadece login**.
Token yapısı, refresh token ve frontend route guard'ları ayrıca ele alınacak.

---

## 1. Veri Modeli — Sorumluluk Dağılımı

### `User` — global kimlik
Kişinin sistemdeki tek kimliği. Restoran bilgisi **içermez**.

| Alan | Not |
|---|---|
| `Id` | PK |
| `FullName` | |
| `Email` | Owner için zorunlu, personel için opsiyonel → **nullable** |
| `PhoneNumber` | |
| `PasswordHash` | |
| `IsActive` | Global hesap durumu (kişi sistemden tamamen men edildi mi) |

- `Email` üzerinde **filtered unique index** (NULL'lar hariç).
- Aynı kişi birden fazla restoranda yer alabilir → tek `User` satırı.

### `Restaurant` — sahiplik
- `OwnerUserId` (FK → User): restoranın sahibi.
- **Yetkilendirmenin birinci kaynağıdır.** Owner'ın yetkisi sahiplikten gelir,
  koşulsuz ve rolsüzdür.

### `UserRestaurant` — çalışan hesabı
Bu tablonun anlamı: **"bu restoranda tanımlı, username ile giren, rolü olan çalışan hesabı."**

| Alan | Not |
|---|---|
| `Id` | PK |
| `UserId` | FK → User |
| `RestaurantId` | FK → Restaurant |
| `Role` | Admin / Waiter / Kitchen / Cashier |
| `UserName` | **NOT NULL** |
| `UserCode` | **NOT NULL** |
| `IsActive` | **YENİ — eklenecek.** Restoran bazında pasiflik |

**Kural: Owner'ın bu tabloda kaydı YOKTUR.**
Owner sahiplik üzerinden zaten her şeye yetkilidir; ayrı bir satıra ihtiyacı yoktur.

**İstisna:** Owner kendisine ayrıca bir çalışan hesabı açabilir
(örn. kasada durmak için `Cashier`). O durumda `UserRestaurant`'ta normal bir
satır oluşur ve `UserName` + `UserCode` gerçekten dolar.
→ Bu satır **aynı `UserId`'yi kullanır**, yeni bir `User` açılmaz.

Bu sayede tablodaki her satırın `UserName` ve `UserCode`'u doludur.
İstisna / null kirliliği yoktur.

### Index'ler
- `UserRestaurant (RestaurantId, UserName)` → **UNIQUE**
- `UserRestaurant (RestaurantId, UserCode)` → **UNIQUE**
- `UserRestaurant (UserId, RestaurantId)` → UNIQUE
  (aynı kişinin aynı restoranda iki çalışan hesabı olmasın)
- `User (Email)` → filtered UNIQUE (WHERE Email IS NOT NULL)

Username artık **global unique değildir**. Her restoran kendi `ahmet`'ini yaratabilir.

---

## 2. Giriş Kuralları

### Temel kural
| Kimlik türü | Kimin |
|---|---|
| **E-posta + şifre** | Sadece Owner |
| **Username + şifre** | Sadece çalışan (`UserRestaurant` kaydı olanlar) |

Slug (tenant) frontend'de subdomain'den çözülür ve `X-Restaurant-Slug`
header'ı ile gönderilir. **Login/register dışındaki hiçbir yerde bu header'a
güvenilmez** — authenticated isteklerde tenant her zaman token'dan okunur.

### Senaryo matrisi

| Slug | Girdi | Sonuç |
|---|---|---|
| Var | E-posta | `User.Email` ile bul → `Restaurant.Slug == slug && OwnerUserId == user.Id` doğrula → **Owner girişi** |
| Var | Username | `UserRestaurant` ⋈ `Restaurant.Slug == slug`, `UserName` eşleşmesi → **Çalışan girişi**, rol o satırdan |
| Var | E-posta ama o restoranın owner'ı değil | Hata |
| Yok | E-posta | **Sadece owner girişi.** (bkz. Açık Konu #1) |
| Yok | Username | Geçersiz — hata |

### "Hangi kapıdan girdiysen o şapkayı takarsın"
Owner'ın hem sahipliği hem de bir `Cashier` çalışan hesabı varsa:
- E-posta ile girdi → **Owner** yetkisi
- Username ile girdi → **Cashier** yetkisi

Güvenlik kaybı yoktur (istediği an e-postayla girip owner olabilir), ancak
"kasada dururken yanlışlıkla menüyü silmeyeyim" ihtiyacını karşılar.

---

## 3. Login Handler Akışı

```
1. Girdinin e-posta mı username mi olduğunu belirle
   (ayrı alanlar ya da format kontrolü — aşağıya bak)

2a. E-POSTA YOLU
    - User'ı Email ile bul (IsDeleted = false)
    - User.IsActive kontrol et
    - Şifreyi doğrula
    - Slug varsa: Restaurant.Slug == slug && OwnerUserId == user.Id
      → değilse hata
    - Slug yoksa: OwnerUserId == user.Id olan restoranları bul
      → bkz. Açık Konu #1
    - Rol = Owner

2b. USERNAME YOLU
    - Slug zorunlu; yoksa hata
    - Restaurant'ı Slug ile bul → yoksa hata
    - UserRestaurant'ı (RestaurantId, UserName) ile bul → yoksa hata
    - UserRestaurant.IsActive kontrol et
    - İlgili User'ı çek, User.IsActive kontrol et
    - Şifreyi doğrula
    - Rol = UserRestaurant.Role

3. Token üret
```

### Doğrulama sırası önemli
Şifre doğrulaması **her zaman** yapılmalı — kullanıcı bulunamadığında bile
dummy hash ile karşılaştırma yaparak timing attack'i engelle.
Aktiflik kontrolleri şifre doğrulamasından **sonra** gelmeli.

---

## 4. Aynı Anda Düzeltilecek Mevcut Buglar

1. **`IsActive` kontrolü yorum satırında.**
   `LoginCommandHandler` içinde kapalı → açılacak. Yeni modelde hem
   `User.IsActive` hem `UserRestaurant.IsActive` kontrol edilecek.

2. **`DateTime.Now` → `DateTime.UtcNow`.**
   Token'daki `expires` alanı UTC bekler. Sunucu UTC+3'teyse token süresi kayar.

3. **`Result<T>.Failure` hata mesajları tek tip olmalı** (aşağıya bak).

---

## 5. Hata Mesajları

Kullanıcı enumeration'ı önlemek için başarısız giriş denemelerinin tamamı
**tek tip** mesaj döner:

> "Kullanıcı adı, e-posta veya şifre hatalı."

Bu şu durumların hepsini kapsar:
- Kullanıcı yok
- Şifre yanlış
- E-posta ile girmeye çalışan ama owner olmayan kullanıcı
- Pasif çalışan hesabı

**İstisna:** "Restoran bulunamadı" ayrı bir mesaj olabilir, çünkü slug zaten
URL'de görünüyor — bilgi sızıntısı yok.

> ⚠️ Ödünleşim: Owner olmayan biri e-postasıyla girmeye çalıştığında
> "e-posta ile giriş yapamazsınız, kullanıcı adınızı kullanın" demek daha iyi
> UX olurdu ama o e-postanın sistemde kayıtlı olduğunu sızdırır.
> **Şimdilik güvenlik tarafı seçildi.**

---

## 6. Açık Konular (bu iş kapsamında değil, sırada)

1. **Slug'sız girişte owner'ın birden fazla restoranı varsa ne olacak?**
   `FirstOrDefault` ile ilkini seçmek kabul edilemez. Öneri: slug'sız login
   restoran seçilmemiş bir token üretir → frontend restoran listesini gösterir
   → seçim sonrası ilgili subdomain'e yönlendirilir ve tam token orada alınır.
   Tek restoranı varsa doğrudan yönlendir.

2. **Girdi tipi ayrımı nasıl yapılacak?**
   Tek input alıp `@` içeriyor mu diye bakmak mı, yoksa frontend'de iki ayrı
   sekme/alan mı? İkincisi daha net ama UI değişikliği gerektiriyor.

3. **Token içeriği:** `UserId`, `RestaurantId`, `Role`, `UserRestaurantId`, `slug`.
   Ayrıca refresh token, axios response interceptor (401 → logout),
   `PrivateRoute`'a rol kontrolü.

4. **Personel şifre sıfırlama.** `VerificationCode` e-posta/telefon üzerinden
   çalışıyor; e-postası olmayan garson bu akışı kullanamaz → owner panelden
   sıfırlar. Bilinçli karar.

5. **Brute-force koruması** — rate limit / hesap kilitleme yok.

---

## 7. Yetkilendirme Notu (implementasyon sırasında dikkat)

Owner `UserRestaurant`'ta olmadığı için yetki kontrolü iki kaynaktan gelir.
Bu dallanma **tek bir yerde** kapsüllenmeli, controller'lara yayılmamalı:

```csharp
// Örnek imza
Task<UserAccess?> ResolveAsync(Guid userId, Guid restaurantId);
// İçeride: önce Restaurant.OwnerUserId kontrolü, yoksa UserRestaurant'a düş
```

Dışarıdaki hiçbir kod bu ikiliği bilmemeli.
