# Ürün Görselleri — Bunny Storage + CDN Entegrasyonu

**Yaklaşım:** Dosya frontend → .NET API → Bunny Storage şeklinde akar.
Okuma tarafı ise doğrudan CDN'den olur, API'ye hiç uğramaz.

---

## 0. Ön Hazırlık (Bunny Paneli) — TAMAMLANDI

- [x] Storage Zone oluştur (S3 Compatibility **açık**, bölge: Frankfurt)
- [x] Pull Zone oluştur ve storage zone'a bağla
- [x] Test: panelden resim yükle, `https://<pullzone>.b-cdn.net/<dosya>` adresinden aç
- [x] Access Key'i panelden al (Access / FTP & API Access sekmesi)
- [ ] *(Opsiyonel, sonraya)* Custom domain: `cdn.fatihkayaci.com` → DNS CNAME kaydı

---

## 1. Konfigürasyon

**Uygulandı**, ama şu üç değeri gerçek panelinden alıp elle doldurman gerekiyor:
- `Backend/RestaurantBill.WebAPI/appsettings.json` → `BunnyStorage.StorageZoneName` ve
  `BunnyStorage.CdnBaseUrl` (şu an `"senin-zone-adin"` / `"https://pullzone-adin.b-cdn.net"`
  placeholder olarak duruyor — bunlar sır değil, git'e girebilir)
- Yerel `.env` → `BunnyStorage__AccessKey=` satırına panelden aldığın gerçek Access Key'i yaz
- Sunucudaki `.env`'e aynı satırı ekle (bkz. GitHub Secrets notu aşağıda)

### `appsettings.json`

```json
"BunnyStorage": {
  "StorageZoneName": "senin-zone-adin",
  "Region": "de",
  "AccessKey": "",
  "CdnBaseUrl": "https://pullzone-adin.b-cdn.net"
}
```

> `AccessKey` boş bırakılır — git'e gizli bilgi girmez.

### `.env` (local)

```
BunnyStorage__AccessKey=panelden_aldigin_key
```

> **Çift alt çizgi** (`__`) kullan. .NET bunu `BunnyStorage:AccessKey` olarak okur.

### `docker-compose.yml`

API servisinin `environment` bloğuna ekle:

```yaml
- BunnyStorage__AccessKey=${BunnyStorage__AccessKey}
```

### GitHub Secrets (deploy için)

- [x] ~~Repo → Settings → Secrets → `BUNNY_ACCESS_KEY` ekle~~ — **gerekli değil.**
      `deploy.yml` zaten secret'lardan `.env` üretmiyor; sunucudaki `/root/RestaurantBill/.env`
      dosyası git'in dışında, kalıcı olarak duruyor (JWT_SECRET_KEY, DB_PASSWORD aynı şekilde).
      Sadece sunucudaki `.env`'e elle `BunnyStorage__AccessKey=...` satırını ekle, deploy script'i
      dokunmadan olduğu gibi okuyacak (docker-compose otomatik `.env` yükler).
- [ ] `deploy.yml` içinde sunucudaki `.env` dosyasına yazdır — *(yukarıdaki nedenle atlandı)*

---

## 2. Paket Kurulumu

```bash
dotnet add src/Infrastructure package SixLabors.ImageSharp
```

> Görsel küçültme + WebP dönüşümü için. Bunny'ye yükleme `HttpClient` ile
> yapılacağı için ekstra S3 paketi gerekmiyor.

---

## 3. Application Katmanı — Arayüz

`Application/Common/Interfaces/IImageStorageService.cs`

```csharp
public interface IImageStorageService
{
    Task<string> UploadAsync(Stream content, string fileName, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
}
```

- [x] Arayüzü Application katmanında tanımla — `Application/Interfaces/IImageStorageService.cs`
      *(dokümandaki `Common/Interfaces` yerine projedeki mevcut `Interfaces/` klasörüne kondu,
      `IAppDbContext`/`ICurrentUserService` ile aynı yer)*. `fileName` parametresi kaldırıldı,
      çünkü hiçbir yerde kullanılmıyordu — anahtar her zaman GUID ile üretiliyor.
- [x] Dönen değer **key** olsun (`products/abc123.webp`), tam URL değil

> Bu soyutlama sayesinde ileride Bunny → R2 geçişi tek dosya değişikliği olur.

---

## 4. Infrastructure Katmanı — Uygulama

`Infrastructure/Storage/BunnyStorageService.cs`

```csharp
public sealed class BunnyStorageService : IImageStorageService
{
    private readonly HttpClient _http;
    private readonly BunnyStorageOptions _options;

    public async Task<string> UploadAsync(Stream content, string fileName, CancellationToken ct)
    {
        var key = $"products/{Guid.NewGuid():N}.webp";
        var url = $"https://storage.bunnycdn.com/{_options.StorageZoneName}/{key}";

        using var request = new HttpRequestMessage(HttpMethod.Put, url);
        request.Headers.Add("AccessKey", _options.AccessKey);
        request.Content = new StreamContent(content);
        request.Content.Headers.ContentType =
            new MediaTypeHeaderValue("image/webp");

        var response = await _http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        return key;
    }

    public async Task DeleteAsync(string key, CancellationToken ct)
    {
        var url = $"https://storage.bunnycdn.com/{_options.StorageZoneName}/{key}";
        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Headers.Add("AccessKey", _options.AccessKey);
        await _http.SendAsync(request, ct);
    }
}
```

- [x] `BunnyStorageOptions` sınıfını oluştur ve `IOptions` ile bağla — `Application/Common/BunnyStorageOptions.cs`
      *(Infrastructure yerine Application'a kondu, çünkü `GetAllProductQueryHandler` da CDN URL'i
      kurmak için aynı seçeneklere ihtiyaç duyuyor; Infrastructure zaten Application'a referans veriyor)*
- [x] `InfrastructureServiceExtensions.cs` içinde `AddHttpClient<IImageStorageService, BunnyStorageService>()` kaydet
      *(proje `DependencyInjection.cs` değil `Extensions/InfrastructureServiceExtensions.cs` kullanıyor)*

---

## 5. Görsel İşleme (Upload'tan Önce)

- [ ] Uzun kenarı **max 800px** olacak şekilde küçült
- [ ] **WebP** formatına çevir (kalite ~80)
- [ ] Orijinal dosyayı sakla**ma**

```csharp
using var image = await Image.LoadAsync(uploadedStream, ct);

image.Mutate(x => x.Resize(new ResizeOptions
{
    Mode = ResizeMode.Max,
    Size = new Size(800, 800)
}));

var output = new MemoryStream();
await image.SaveAsWebpAsync(output, new WebpEncoder { Quality = 80 }, ct);
output.Position = 0;
```

> 4MB'lık telefon fotoğrafı bu işlemden sonra ~60KB'a düşer.
> Hem depolama hem bandwidth hem sayfa hızı kazancı.

**Uygulandı:** Bu adım ayrı bir yerde değil, doğrudan `BunnyStorageService.UploadAsync` içinde
yapılıyor (resize + WebP + Bunny'ye PUT tek metotta). Böylece `IImageStorageService` arayüzü
ImageSharp'tan tamamen habersiz kalıyor — Application katmanı hâlâ temiz.
**Not:** `SixLabors.ImageSharp` 3.0+ ticari kullanım için ücretli lisans gerektiriyor
(Six Labors Split License). Dokümandaki "ücretsiz" varsayımıyla çelişmemesi için proje
**2.1.13** sürümüne sabitlendi (son Apache-2.0 sürüm, sınırsız ücretsiz kullanım).

---

## 6. Doğrulama (Güvenlik)

- [x] Maksimum dosya boyutu: **5 MB** (kontrol et, aşarsa reddet) — `UploadProductImageCommandValidator`
- [x] İzinli content-type: `image/jpeg`, `image/png`, `image/webp` — aynı validator
- [x] Uzantıya güvenme — `Image.LoadAsync` zaten geçersiz dosyada exception atar,
      bunu yakalayıp anlamlı hata dön — `UploadProductImageCommandHandler` try/catch ile yakalıyor
- [x] `Program.cs` / Kestrel'de request body limitini kontrol et — Kestrel varsayılanı (30 MB) zaten
      yeterli; controller'a `[RequestSizeLimit(6_000_000)]` eklendi (ekstra güvenlik katmanı)

---

## 7. API Endpoint

`POST /api/product/{id}/image` (multipart/form-data)
*(rota `products` değil `product` — projedeki `ProductController`'ın `[controller]` rotası tekil)*

- [x] `IFormFile` parametresi al
- [x] Yetki kontrolü: kullanıcı bu ürünün şirketine ait mi? *(multi-tenant izolasyon)* —
      `product.Category.BranchId != _currentUser.BranchId` kontrolü
- [x] Görseli işle → Bunny'ye yükle → dönen key'i al
- [x] **Ürünün eski görseli varsa onu Bunny'den sil** (yetim dosya bırakma) — yeni görsel
      başarıyla kaydedildikten *sonra*, best-effort olarak siliniyor (silme başarısız olsa bile
      istek başarılı sayılır, kullanıcı yeni görseli görür)
- [x] `Product.ImageUrl` alanını yeni key ile güncelle — `Product.UpdateImage(key)`
- [x] Response'ta tam CDN URL'ini dön

---

## 8. Mevcut Kodda Yapılacak Düzeltmeler

- [x] **`UpdateProductCommand`'a `ImageUrl` alanı ekle** — eklendi, ama gerçek görsel *değişimi*
      hâlâ sadece `/product/{id}/image` üzerinden oluyor (Bunny'deki eski dosyanın silinmesi
      sadece o akışta garanti). Buradaki `ImageUrl` alanı, formun mevcut değeri geri gönderip
      görseli koruması (ya da bilinçli olarak temizlemesi) için var; rastgele bir key'e izin
      vermek yetim dosya riski yaratacağından burada Bunny silme mantığı çalıştırılmıyor.
- [x] `Product` entity'sinde görsel güncelleme için metot ekle — `Product.UpdateImage(string imageUrl)`
- [x] `ProductDto` / response mapping'inde key → tam URL birleştirmesi yap:
      `$"{CdnBaseUrl}/{product.ImageUrl}"` — `GetAllProductQueryHandler` içinde
- [x] Ürün silinirken görselin de silinmesini sağla — `DeleteProductCommandHandler`, ürün
      DB'den silindikten sonra best-effort olarak Bunny'den de siliniyor

> **Kural:** Veritabanında **asla tam URL tutma.** Sadece key tut.
> CDN domain'i değişirse tek config satırı değişir, migration gerekmez.

---

## 9. Frontend (React)

- [x] `MenuPage.tsx` → "Yakında eklenecek" butonunu aktif et
- [x] Dosya seçme input'u (`accept="image/jpeg,image/png,image/webp"`)
- [x] Seçilen görselin önizlemesi — `URL.createObjectURL`, upload bitince sunucudan dönen
      CDN URL'iyle değiştiriliyor
- [x] `FormData` ile `POST /api/product/{id}/image` çağrısı — `productService.uploadProductImage`
- [x] Yükleme sırasında loading state (mobil internette 10-20 sn sürebilir) — ayrıca global axios
      timeout'u (5 sn) bu istek için 30 sn'ye çıkarıldı, yoksa yavaş bağlantıda otomatik patlardı
- [x] Başarı/hata bildirimi — `sonner` toast
- [x] Ürün kartlarında görseli göster, **görsel yoksa placeholder** kullan — hem admin
      `MenuPage` kartları hem de müşteri tarafı `ProductCard`
- [x] `<img loading="lazy">` ekle — menüde çok ürün olabilir

**Not:** Yeni ürün oluştururken `{id}` henüz yok, bu yüzden upload endpoint'i kullanılamıyor.
Bunun için "Ürün Ekle" akışı şöyle kuruldu: ürün önce kaydediliyor, sonra modal kapanmadan
otomatik olarak "düzenleme" moduna geçip görsel yükleme alanı aktifleşiyor
(*"Ürün eklendi. Şimdi görsel ekleyebilirsiniz."* bildirimiyle).

---

## 10. Test Kontrol Listesi

Aşağıdakiler gerçek bir Bunny hesabı + tarayıcı gerektirdiği için **manuel olarak senin
tarafından doğrulanmalı**. Bunlara denk gelen mantık otomatik testlerle kapsandı
(`ProductCommandHandlerTests.UploadProductImageHandlerTests`, `DeleteProductHandlerTests`):
ürün bulunamama, başka şubeden erişim reddi, storage hatasında anlamlı hata dönme, eski
görselin silinmesi, `ImageUrl`'in güncellenmesi — hepsi sahte (`FakeImageStorageService`)
depolama ile test edildi; gerçek Bunny API çağrısı test edilmedi.

- [ ] JPEG yükle → CDN'de WebP olarak açılıyor mu?
- [ ] PNG yükle → çalışıyor mu?
- [ ] 10MB'lık dosya → düzgün hata dönüyor mu?
- [ ] `.pdf` uzantısını `.jpg` yapıp yükle → reddediyor mu?
- [ ] Aynı ürüne ikinci görsel yükle → eski dosya Bunny'den silindi mi?
- [ ] Ürünü sil → görsel de silindi mi?
- [ ] Başka şirketin ürününe görsel yüklemeyi dene → reddediliyor mu?
      *(not: `Result.Failure` üzerinden 400 dönüyor, projedeki diğer yetki kontrolleriyle
      aynı desen — gerçek bir 403 değil)*
- [ ] Production'a deploy et → env variable doğru geçti mi?

---

## Notlar

**Neden presigned URL kullanmıyoruz?**
Şu an ihtiyaç yok. Görselleri sadece admin yüklüyor, ayda birkaç kez.
Sunucudan geçirmek daha basit, doğrulama yapmaya izin veriyor ve tek
atomik işlem oluyor. Hacim artarsa geçiş kolay — `ImageUrl` alanında key
tutulduğu için veritabanına dokunmadan sadece upload akışı değişir.

**Neden Bunny Optimizer almıyoruz?**
Aylık ~$10 sabit ücret. ImageSharp ile aynı işi ücretsiz yapıyoruz.
Yüzlerce restoran olduğunda tekrar değerlendirilir.

**S3 uyumluluğu ne oldu?**
Zone'da açık ama şimdilik kullanılmıyor — Bunny'nin kendi HTTP API'si
bu iş için daha basit. Toggle açık kaldığı için ileride `AWSSDK.S3`'e
geçmek istenirse hazır. *(Zone kurulduktan sonra bu ayar değiştirilemiyor,
o yüzden açık bırakıldı.)*

**Cache davranışı**
Dosya adları GUID olduğu için aynı isim iki kez kullanılmaz. Görsel
değişince key de değişir, dolayısıyla cache invalidation problemi yok.

---

## Ek Özellik — Görsel Kırpma (Gerçek Piksel Kırpma)

Kartlarda görsel `aspect-video` kutusuna `object-cover` ile sığdırılıyor; dikey/kare
fotoğraflarda üst veya alt kesilebiliyor. Bu sorun için sırasıyla iki ara çözüm denendi
(Üst/Orta/Alt butonları, sonra sürükle-konumlandır) ve ikisi de kaldırıldı — kullanıcı
**gerçek piksel bazlı kırpma** istedi: görsel gerçekten kesilip yeniden yükleniyor, sadece
CSS ile "gösterilen kısmı" değiştirme değil.

- [x] `ImageFocusX`/`ImageFocusY` alanları ve tüm ilgili kod (entity, DTO, command/handler,
      `/image-focus` endpoint'i) **tamamen geri alındı** — artık gerekli değil, çünkü kırpılan
      görsel zaten tam olarak `16:9` çıkıyor.
- [x] Frontend: `pnpm add react-easy-crop` (React 19 ile uyumlu, peer dep üst sınırı yok).
      `lib/cropImage.ts` — `getCroppedImageBlob()`, seçilen kırpma alanını `<canvas>` ile
      gerçekten kesip JPEG `Blob` üretiyor (kalite 0.92).
      `features/products/components/ImageCropModal.tsx` — `react-easy-crop`'un `Cropper`
      bileşeniyle tam fotoğrafı gösterip sürükle (pan) + kaydırıcıyla yakınlaştır (zoom),
      **"Kırp ve Kaydet"** butonuna basmadan hiçbir şey kaydedilmiyor (önceki sürümdeki
      "kaydete basmadan koyuyor" şikayeti böylece çözüldü).
- [x] Akış: dosya seçilince (veya "Yeniden kırp"a basılınca) kırpma modalı açılıyor →
      onaylanınca kırpılmış `Blob`, **var olan** `POST /api/product/{id}/image` endpoint'ine
      yükleniyor (backend'de ek değişiklik gerekmedi — zaten resize+webp+eski-dosya-silme
      mantığı oradaydı, sadece girdi artık orijinal dosya değil kırpılmış hali).
- [x] "Yeniden kırp": zaten yüklü olan CDN görselini tekrar kırpma modalına yüklüyor. **Bilinen
      sınırlama:** Bunny CDN'in CORS header'ları göndermediği bir durumda, canvas'tan blob
      export adımı (`canvas.toBlob`) tarayıcı güvenlik kısıtlaması yüzünden başarısız olabilir —
      bu durumda kullanıcıya "Görsel kırpılamadı, farklı bir görsel deneyin" hatası gösteriliyor
      (kilitlenme yok, zarifçe düşüyor). Yeni dosya seçip kırpmak her zaman çalışır çünkü o,
      tarayıcıdaki yerel `blob:` URL'i kullanıyor, CORS'a hiç takılmıyor.
- [x] `Domain/Enums/ImageFocus.cs` silindi, `ProductCard.tsx`/admin kartlarında `object-position`
      hack'i kaldırıldı — düz `object-cover` yeterli çünkü kaynak zaten 16:9.
- [x] Üç migration da oluşturuldu ve lokal veritabanına uygulandı (önceki ikisi zaten
      `origin`'e push'lanmıştı, o yüzden hiçbirini değiştirmedim, üstüne ekledim):
      1. `20260826085511_AddProductImageFocus` — ilk sürümün `ImageFocus` int kolonu
      2. `20260826091020_ReplaceProductImageFocusWithContinuousXY` — X/Y'ye geçiş
      3. `20260826092646_DropProductImageFocusColumns` — X/Y kolonlarını tamamen düşürüyor
      Tüm test suite (190 test) yeşil.
- [ ] Production'a deploy edildiğinde tüm migration'lar sunucuda otomatik uygulanacak
      (`MigrateAndSeedAsync` açılışta `context.Database.Migrate()` çağırıyor) — ekstra bir şey
      yapmana gerek yok.
