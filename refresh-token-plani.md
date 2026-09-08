# Refresh Token & Oturum Yönetimi — Uygulama Planı

Bu doküman, mevcut tek-token (8 saatlik JWT + localStorage) yapısından
refresh token'lı bir oturum yönetimine geçiş için alınan kararları ve
yapılacak işleri içerir.

---

## 1. Mevcut Durum ve Kapatılacak Açıklar

| Sorun | Nerede | Etki |
|---|---|---|
| Refresh token yok | — | Token dolunca kullanıcı yeniden giriş yapmak zorunda |
| Access token ömrü 8 saat | `JwtTokenGenerator.GenerateToken` | Çalınan token 8 saat geçerli; rol değişikliği 8 saat yansımıyor |
| Response interceptor yok | `frontend/src/lib/axiosInstance.ts` | 401 hiç yakalanmıyor; kullanıcı ölü ekranda kalıyor |
| `ClockSkew` default (5 dk) | `AuthExtensions` | 15 dk'lık token pratikte 20 dk yaşar |
| `Şifremi unuttum` butonu ölü | `LoginPage.tsx` | `onClick` yok, ekranda görünür halde duruyor |
| SignalR token yenilenmiyor | `AuthExtensions` (`access_token` query) | Token dolunca hub bağlantısı sessizce kopuyor |

---

## 2. Alınan Kararlar

**Saklama**
- Access token: bellekte / `localStorage` (mevcut akış korunur).
- Refresh token: **`HttpOnly` + `Secure` + `SameSite` cookie**. JS erişemez.
- DB'de refresh token **hash'lenmiş** tutulur (`SHA-256`), düz metin asla saklanmaz.

**Ömürler**

| | Cookie | DB `ExpiresAt` | `AbsoluteExpiresAt` |
|---|---|---|---|
| Access token | — | — | 15 dakika |
| "Beni hatırla" **kapalı** | session cookie (`Expires` yok) | +1 gün | +1 gün |
| "Beni hatırla" **açık** | `Expires = +30 gün` | +30 gün | +30 gün |

**Rotation**
- Her `/refresh` çağrısında hem access hem refresh token yeniden üretilir.
- Eski refresh token `RevokedAt` ile kapatılır, `ReplacedByToken` ile yenisine bağlanır.

**Absolute expiry (kayan değil, mutlak)**
- Rotation sırasında `AbsoluteExpiresAt` **değişmez**, ilk login'de belirlenir.
- Böylece 30 gün sonunda kullanıcı ne kadar aktif olursa olsun tekrar giriş yapar.
- Yeni token'ın `ExpiresAt`'i `min(now + ömür, AbsoluteExpiresAt)` olarak hesaplanır.

**Reuse detection**
- Gelen refresh token DB'de `RevokedAt != null` ise: token sızmış demektir.
- O zincire (`ReplacedByToken` ile bağlı tüm aile) ait **tüm** kayıtlar revoke edilir.
- `AuditLogCategory.Auth` / `Severity.Warning` ile log atılır.

**"Beni hatırla" rol kısıtı**
- Checkbox login ekranında herkese görünür (rol login öncesi bilinmiyor).
- Ancak **sunucu tarafında** rol `Owner` veya `Admin` değilse istek yok sayılır,
  1 günlük ömür uygulanır.
- Gerekçe: Waiter / Kitchen / Cashier ekranları ortak cihazlarda çalışıyor.
  30 günlük oturum, bir sonraki vardiyadaki kişinin başkasının kimliğiyle
  sipariş girmesine ve `AuditLog`'a yanlış isim yazılmasına yol açar.
  O cihazlarda tarayıcı zaten kapanmadığı için ihtiyaç da yok.

---

## 3. Backend

### 3.1 Domain

`RestaurantBill.Domain/Entities/RefreshToken.cs`

| Alan | Tip | Not |
|---|---|---|
| `Id` | `Guid` | |
| `UserId` | `Guid` | FK |
| `BranchId` | `Guid` | Hangi restoran kapsamında üretildi |
| `Role` | `UserRole` | Rotation'da doğrulama için |
| `TokenHash` | `string` | SHA-256, unique index |
| `ExpiresAt` | `DateTime` | Bu token'ın ömrü |
| `AbsoluteExpiresAt` | `DateTime` | Zincirin mutlak sonu, rotation'da sabit |
| `RevokedAt` | `DateTime?` | |
| `ReplacedByTokenHash` | `string?` | Zincir takibi |
| `CreatedByIp` | `string?` | Reuse tespitinde teşhis için |
| `UserAgent` | `string?` | "Aktif oturumlarım" ekranı ileride yapılırsa |

Davranışlar (rich model, TODO'daki refactor yönüyle uyumlu):
`IsActive` (computed), `Revoke()`, `ReplaceWith(newHash)`.

### 3.2 Persistence
- `RefreshTokenConfiguration` — `TokenHash` unique index,
  `(UserId, ExpiresAt)` composite index.
- Migration: `AddRefreshToken`.

### 3.3 Application (CQRS)

```
Features/Auths/Commands/
├── Login/           → değişecek: RememberMe alanı + refresh üretimi
├── RefreshToken/    → YENİ: RefreshTokenCommand + Handler
└── Logout/          → YENİ: LogoutCommand + Handler (sunucuda revoke)
```

- `LoginCommand`'a `bool RememberMe` eklenir.
- `LoginResponseDto` refresh token'ı **body'de döndürmez** — cookie olarak yazılır,
  bu yüzden cookie set etme işi Controller katmanında olur (Application katmanı
  `HttpContext` bilmemeli). Handler ham refresh token'ı DTO'da Controller'a verir,
  Controller cookie'ye yazıp DTO'dan temizler.

### 3.4 WebAPI

`AuthController`:
- `POST /api/auth/refresh` — cookie'den okur, doğrular, rotate eder, yeni çift döner.
- `POST /api/auth/logout` — DB'de revoke + cookie siler. (Şu an frontend'de sadece
  `localStorage.removeItem` var, sunucu tarafı hiç haberdar olmuyor.)

Cookie ayarları:
```csharp
new CookieOptions
{
    HttpOnly = true,
    Secure   = true,
    SameSite = SameSiteMode.None,   // frontend farklı domaindeyse
    Path     = "/api/auth",         // her isteğe eklenmesin
    Expires  = rememberMe ? absoluteExpiresAt : null  // null = session cookie
}
```

> **Dev ortamı uyarısı:** `SameSite=None` + `Secure`, `http://localhost` üzerinde
> çalışmaz. Development için `SameSite=Lax` + `Secure=false` olacak şekilde
> ortam bazlı config gerekir.

`JwtTokenGenerator`:
- `AddHours(8)` → `AddMinutes(15)`.
- Süre `appsettings` üzerinden okunacak şekilde dışarı alınsın
  (`JwtSettings:AccessTokenMinutes`).

`AuthExtensions`:
- `TokenValidationParameters`'a `ClockSkew = TimeSpan.Zero` eklenir.

CORS:
- `AllowCredentials()` + spesifik origin (credential varken `AllowAnyOrigin` çalışmaz).

### 3.5 Temizlik
- Süresi geçmiş / revoke edilmiş kayıtlar için periyodik silme
  (`IHostedService` veya mevcut bir background job varsa oraya).

---

## 4. Frontend

### 4.1 `axiosInstance.ts`
- `withCredentials: true`.
- **Response interceptor** eklenir:
  - 401 gelirse `/api/auth/refresh` denenir, başarılıysa orijinal istek tekrarlanır.
  - Refresh de başarısızsa: `localStorage` temizlenir, `/login`'e yönlendirilir.
  - `/auth/refresh`'in kendisi 401 verirse tekrar denenmez (sonsuz döngü koruması);
    orijinal request'e `_retry` flag'i konur.
- **Single-flight:** Eş zamanlı 5 istek birden 401 alırsa 5 refresh çağrısı gitmemeli.
  Tek bir refresh promise'i tutulur, diğerleri kuyruğa alınır, sonuç gelince
  hepsi yeni token'la tekrarlanır. (Rotation varken bu şart — paralel refresh'ler
  birbirini revoke edip reuse detection'ı yanlışlıkla tetikler.)
- `timeout: 5000` refresh isteği için de geçerli, sorun değil ama akılda olsun.

### 4.2 `LoginPage.tsx`
- "Beni hatırla" checkbox'ı eklenir, `login` isteğine `rememberMe` olarak gider.
- Ölü `Şifremi unuttum` butonu: ya `onClick` bağlanır ya da sayfadan kaldırılır.

### 4.3 `authService.ts`
- `logout` artık `POST /auth/logout` çağırır, sonra localStorage'ı temizler.
- `refresh` metodu eklenir.

### 4.4 SignalR
- Hub bağlantıları `accessTokenFactory: () => localStorage.getItem('token')`
  kullanmalı — böylece her reconnect'te güncel token okunur.
- `withAutomaticReconnect()` + `onclose` içinde refresh denemesi.
- Şu anki `?access_token=` query yaklaşımı korunabilir, ama token'ı bağlantı
  kurulurken **bir kez** okuyup sabitlememek gerekiyor.

---

## 5. Yan Kazanç: Rol Değişikliği

TODO'daki şu madde bu yapıyla kendiliğinden çözülüyor:

> *Auth: Admin, giriş yapmış bir kullanıcının rolünü değiştirdiğinde o kullanıcı
> uyarılıp login sayfasına yönlendirilecek.*

`/refresh` handler'ı rolü DB'den yeniden okur. `RefreshToken.Role` ile DB'deki
rol farklıysa → tüm refresh token'lar revoke edilir, 401 döner, interceptor
kullanıcıyı login'e atar. Ayrı bir mekanizma yazmaya gerek yok; gecikme en fazla
15 dakika. Aynısı `IsActive = false` yapılan personel için de geçerli.

---

## 6. Uygulama Sırası

1. **Response interceptor + 401 handling** (refresh olmadan da mevcut bug'ı kapatır)
2. `RefreshToken` entity + configuration + migration
3. `RefreshTokenCommand` / `LogoutCommand` + Controller + cookie yazımı
4. Access token 15 dk + `ClockSkew = Zero` + CORS `AllowCredentials`
5. Interceptor'a gerçek refresh akışı + single-flight kuyruğu
6. "Beni hatırla" checkbox + sunucu tarafı rol kısıtı
7. SignalR `accessTokenFactory` düzeltmesi
8. Reuse detection + audit log
9. Süresi geçmiş token temizleme job'ı
10. *(Ayrı iş)* Şifremi unuttum akışı

---

## 7. Test Edilecek Senaryolar

- [ ] 15 dk sonra sayfa açıkken bir istek at → sessizce yenilenmeli, kullanıcı fark etmemeli
- [ ] Beni hatırla kapalı + tarayıcı kapat/aç → login ekranı gelmeli
- [ ] Beni hatırla açık + 30 gün sonra → aktif olsa bile login istemeli (absolute expiry)
- [ ] Aynı anda 5 paralel istek 401 alsın → sadece 1 refresh çağrısı gitmeli
- [ ] Eski (revoke edilmiş) refresh token ile istek → tüm zincir revoke, audit log
- [ ] Waiter hesabı `rememberMe: true` gönderirse → sunucu 1 gün vermeli
- [ ] Logout sonrası eski refresh token ile istek → 401
- [ ] Admin rolü değiştirsin → en geç 15 dk içinde kullanıcı login'e düşmeli
- [ ] SignalR açıkken token yenilensin → hub bağlantısı kopmamalı / reconnect olmalı
