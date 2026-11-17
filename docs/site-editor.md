# Görsel site düzenleyicisi: Taslak + Yayınla, fotoğraflar, Google ve paylaşım

Admin'deki `/admin/site` form sayfasının yerine gelen WYSIWYG düzenleyicinin backend'i. Tasarım:
<https://claude.ai/artifact/AmfKG3NtspqWnnWRrBQA2Z> (özellikle 2 fotoğraf paneli, 6 yayın durumları, 12 Google ve paylaşım).

Kararlar (kullanıcı onaylı):

1. Bütün site düzenlemeleri **taslağa** gider. Müşteri sitesi **Yayınla**'ya kadar eski hâli gösterir. "Değişiklikleri at"
   taslağı siler. Değişen alanlar listelenir, her biri tek tek geri alınabilir.
2. **Fotoğraflar da taslağın parçasıdır.** Yüklenen ya da seçilen fotoğraf taslağa yazılır. Yayınla'da yayından kalkan eski
   dosya silinir. "At"ta yalnız taslağa yüklenmiş dosyalar silinir. Hazır görseller (`shared/stock/...`) site
   fotoğraflarında da seçilebilir ve **hiçbir zaman silinmez**.
3. **SEO / paylaşım** alanları taslakta: `seoTitle`, `seoDescription`, paylaşım görseli. Boş bırakılan alan otomatik dolar.
4. **Sunucu tarafı etiketler.** Botlar JavaScript çalıştırmaz. Bu yüzden API, restoran alt alan adlarındaki sayfa
   açılışlarına restoranın başlık/og etiketleri yazılmış `index.html`'i döner.
5. Aynı anda iki kişi düzenlerse son yazan kazanır. Ama taslağın bir **sürümü** var: eski sürümle kaydetmek 409 döner
   ("başkası da düzenledi"). Yayınla ve At denetim kaydına yazılır.
6. Restoran adı, adres ve telefon taslağa girmez (Ayarlar'da kalır).

---

## 1. Depolama

Migration: `20261117072711_AddSiteDraftAndSeo`. `Branches` tablosuna 4 sütun ekler, veri taşıma yok:

| Sütun | Tür | Anlamı |
|---|---|---|
| `SiteDraft` | `jsonb`, null olabilir | Sitenin taslağa alınabilen **bütün** hâli. `null` = taslak yok. |
| `SiteDraftVersion` | `integer`, varsayılan 0 | Her taslak yazımında, Yayınla'da ve At'ta 1 artar. Çatışma denetimi için. |
| `SiteDraftUpdatedAt` | `timestamptz`, null | Son taslak yazımı ("Taslak kaydedildi · az önce"). |
| `SitePublishedAt` | `timestamptz`, null | Son Yayınla ("Yayında · son yayın bugün 14:32"). |

Yayındaki SEO değerleri yeni sütun açmadan mevcut `SiteContent` jsonb'sine eklendi: `SeoTitle`, `SeoDescription`,
`ShareImage`. Eski kayıtlarda bu anahtarlar yoktur ve boş (= otomatik) sayılır.

**Neden tek jsonb anlık görüntü (snapshot)?**

- Müşteri sitesinin okuma yolu **hiç değişmedi**. `GET api/public/site` yine şubenin sütunlarını ve `SiteContent`'i okur.
  Taslağı yalnızca düzenleyici okur.
- Taslak, yayındaki hâlin tam kopyasıdır (domain: `SiteSnapshot`, `Domain/Entities/SiteSnapshot.cs`): site metin
  sütunları (`SiteHeadline` … `SiteAccentColor`, `OpensAt`/`ClosesAt`, kapak ve hikâye anahtarları) ve bütün
  `SiteContent`. Yayınla tek atamayla kopyalar (`Branch.PublishSiteDraft`). At, `SiteDraft = null` yapar.
- "Değişen alanlar" ve "Geri al" iki snapshot'ın alan alan karşılaştırmasıdır (`SiteSnapshot.ChangedFields` /
  `WithFieldFrom`). Ayrı bir revizyon tablosu ve geçmiş gerekmedi.
- jsonb şekli `Persistence/Configurations/BranchConfiguration.cs` → `SiteDraftJson` dosyasındadır. `Content` anahtarı
  `SiteContentJson` ile aynı şekli taşır.

**Fotoğraf silme kuralı** (tek kural, her uçta aynı): bir değişiklikten sonra artık **ne yayında ne taslakta** kullanılan
anahtar silinir (`BranchSiteLoader.DeleteUnusedImagesAsync`, `Branch.SiteImageKeysInUse`). Silme her zaman
`IImageStorageService.DeleteReplacedImageAsync` üzerinden yapılır. Bu yüzden `shared/` altındaki hiçbir dosya silinmez
(bkz. `docs/stock-images.md`). Kuralın sonuçları:

- Taslağa yeni kapak yüklenir: yayındaki kapak hâlâ yayında olduğu için silinmez.
- Taslakta kapak ikinci kez değiştirilir: ilk taslak yüklemesi hiçbir yerde kullanılmaz ve hemen silinir.
- Yayınla: yayından kalkan restoran dosyaları silinir.
- At / Geri al: yalnız taslağa yüklenmiş ve artık kullanılmayan dosyalar silinir.
- Eski form uçları da aynı kuralı kullanır. Taslağın hâlâ kullandığı bir dosyayı silmezler.

---

## 2. API sözleşmesi (ön yüz için)

Bütün uçlar `Authorize(Roles = "Owner,Admin")` ve oturumdaki şubeye bağlıdır (eski site uçlarıyla aynı:
`currentUser.BranchId`). Controller: `WebAPI/Controllers/SiteEditorController.cs`. Hatalar her zaman
`400 { "error": "Türkçe mesaj" }` biçimindedir.

| Yöntem | Yol | Gövde | Sürüm denetimi | Döner |
|---|---|---|---|---|
| GET | `api/branch/site/draft` | – | – | `SiteEditor` |
| PUT | `api/branch/site/draft` | metinler + `version` (aşağıda) | **evet** | `SiteEditor` · 409 |
| POST | `api/branch/site/draft/revert` | `{ "version": 7, "fields": ["coverImage", "region:{id}"] }` | **evet** | `SiteEditor` · 409 |
| POST | `api/branch/site/draft/publish` | `{ "version": 7 }` | **evet** | `SiteEditor` · 409 |
| POST | `api/branch/site/draft/discard` | `{ "version": 7 }` | **evet** | `SiteEditor` · 409 |
| POST | `api/branch/site/draft/image/{slot}` | multipart `file` | hayır | `SiteEditor` |
| POST | `api/branch/site/draft/image/{slot}/stock` | `{ "stockImageId": "…" }` | hayır | `SiteEditor` |
| DELETE | `api/branch/site/draft/image/{slot}` | – | hayır | `SiteEditor` |
| POST | `api/branch/site/draft/gallery[?index=N]` | multipart `file` | hayır | `SiteEditor` |
| POST | `api/branch/site/draft/gallery/stock[?index=N]` | `{ "stockImageId": "…" }` | hayır | `SiteEditor` |
| DELETE | `api/branch/site/draft/gallery/{index}` | – | hayır | `SiteEditor` |
| PUT | `api/branch/site/draft/gallery/order` | `{ "order": [2, 0, 1] }` | hayır | `SiteEditor` |
| POST | `api/branch/site/draft/regions/{regionId}/image` | multipart `file` | hayır | `SiteEditor` |
| POST | `api/branch/site/draft/regions/{regionId}/image/stock` | `{ "stockImageId": "…" }` | hayır | `SiteEditor` |
| DELETE | `api/branch/site/draft/regions/{regionId}/image` | – | hayır | `SiteEditor` |
| GET | `api/stock-images?q=` | – | – | `[{ id, title, group, url }]` (mevcut, en çok 48) |

- `{slot}`: `cover` | `about` | `founder` | `share` | `hero-menu` | `hero-hakkimizda` | `hero-mekan` | `hero-iletisim` |
  `hero-rezervasyon` (alt sayfaların kendi kapakları, bkz. "Alt sayfa kapakları").
- Galeri `?index=N`: o sıradaki fotoğrafı değiştirir (sıra korunur). Verilmezse fotoğraf sona eklenir (en çok 12).
- Yükleme: en çok 10 MB, yalnız JPEG/PNG/WebP. Dosya sunucuda küçültülür: kapak 2000 px, galeri 1600, hikâye ve bölüm
  1400, paylaşım 1200, usta 1000.
- Bölüm başka şubeninse `400 "Bölüm bulunamadı."`. Hazır görsel yoksa ya da pasifse
  `400 "Böyle bir hazır görsel bulunamadı."`.

### `SiteEditor` yanıtı

```jsonc
{
  "version": 7,
  "hasChanges": true,
  "changes": [                                   // ekrandaki sırayla; "N yayınlanmamış değişiklik"
    { "field": "coverImage", "label": "Kapak fotoğrafı", "page": "Anasayfa" },
    { "field": "tagline",    "label": "Alt başlık",      "page": "Anasayfa" },
    { "field": "region:3f0c…", "label": "Bölüm · Salon", "page": "Mekân" }
  ],
  "draftUpdatedAt": "2026-11-17T11:02:10Z",       // null: taslak yok
  "publishedAt": "2026-11-17T09:32:00Z",          // null: hiç Yayınla yapılmadı (eski form kayıtları sayılmaz)
  "draft": { /* BranchSiteDto: düzenleyicide görünen hâl */ },
  "published": { /* BranchSiteDto: müşterinin şu an gördüğü */ },
  "seo": {                                        // TASLAĞIN değerleri (Google/WhatsApp önizleme kartları)
    "title": "Ocak · Kadıköy",
    "description": "Közde pişen et. · Kadıköy · Salı–Pazar 12:00–23:00",
    "shareImageUrl": "https://cdn…/site/kapak.webp",
    "autoTitle": "Ocak · Kadıköy",
    "autoDescription": "Közde pişen et. · Kadıköy · Salı–Pazar 12:00–23:00",
    "autoShareImageUrl": "https://cdn…/site/kapak.webp",
    "titleIsAuto": true, "descriptionIsAuto": true, "shareImageIsAuto": true,
    "pageTitles": { "/menu": "Menü · Ocak", "/hakkimizda": "Hakkımızda · Ocak", "/mekan": "Mekân · Ocak",
                    "/iletisim": "İletişim · Ocak", "/rezervasyon": "Rezervasyon · Ocak", "/siparis": "Paket sipariş · Ocak" }
  },
  "siteUrl": "https://ocak.sophram.com"           // slug yoksa ""
}
```

`draft` ve `published`, eski `GET api/branch/site` ile **aynı** `BranchSiteDto` şeklindedir. Bütün görseller tam CDN
adresidir. `regionDetails` şubenin bütün bölümlerini içerir (ad, masa sayısı, foto, açıklama). DTO'ya üç alan eklendi:

| Alan | Anlamı |
|---|---|
| `seoTitle`, `seoDescription` | Girilen değer; `""` = otomatik. |
| `shareImageUrl` | Seçilen paylaşım görseli; `""` = kapak (otomatik). |
| `menuHeroUrl`, `aboutHeroUrl`, `venueHeroUrl`, `contactHeroUrl`, `reservationHeroUrl` | Alt sayfaların kendi kapakları; `""` = kapak (Mekân'da galeri → hikâye → kapak). |

Hazır görsel mi? Adres `/shared/stock/` içeriyorsa evet. Bu durumda "Temsili görsel" etiketi gösterilir; ayrı bir bayrak
eklenmedi.

### Alan anahtarları (`changes[].field`, `revert.fields`)

`headline, tagline, coverImage, storyTitle, about, aboutImage, hours, hoursNote, instagramUrl, directionsNote,
whatsappPhone, design, theme, accentColor, gallery, amenities, hiddenFaqs, rating, reviewCount, reviewsUrl, featuredReviews, founderPhoto,
founderName, founderTitle, founderQuote, foundedYear, values, milestones, seoTitle, seoDescription, shareImage,
heroMenu, heroAbout, heroVenue, heroContact, heroReservation`,
ayrıca her bölüm için `region:{regionId}` (bölümün fotoğrafı ve açıklaması birlikte).

- `hours`, `opensAt`/`closesAt` ve `weeklyHours` alanlarını birlikte kapsar.
- `gallery` bütün galeri listesidir (sıra dahil).
- Bilinmeyen anahtar `400 "Geçersiz alan."` döner.
- Etiketler ve sayfa adları backend'de sabittir (`SiteDraft.cs` → `SiteEditor.Fields`). Ön yüz isterse kendi metnini
  kullanabilir.

### PUT `api/branch/site/draft` (metinler, otomatik kayıt)

Gövde, eski `PUT api/branch/site` ile aynı alanları ve üç ek alanı taşır:

```jsonc
{
  "version": 7,
  "headline": "", "tagline": "", "storyTitle": "", "about": "",
  "opensAt": "12:00", "closesAt": "23:00",              // ya da null; haftalık saat varsa yok sayılır (en sık aralık yazılır)
  "hoursNote": "", "instagramUrl": "https://…", "accentColor": "#A3301A",
  "theme": "terracotta",
  "design": "sade",                              // "renkli" | "sade" | "" (= renkli); null/eksik = değiştirme
  "weeklyHours": [{ "day": 1, "isOpen": true, "opens": "12:00", "closes": "23:00" } /* … 7 gün ya da [] */],
  "directionsNote": "", "whatsappPhone": "", "amenities": ["avlu"],
  "hiddenFaqs": ["odeme"],                       // gizlenen hazır sorular; null/eksik = değiştirme
  "rating": 4.7, "reviewCount": 1240, "reviewsUrl": "https://…",
  "featuredReviews": [{ "author": "", "text": "", "source": "Google" }],
  "founderName": "", "founderTitle": "", "founderQuote": "", "foundedYear": 1987,
  "values": [{ "title": "", "text": "" }], "milestones": [{ "year": 1987, "text": "" }],
  "regionDetails": [{ "regionId": "…", "description": "" }],   // yalnız regionId + description okunur
  "seoTitle": "",          // "" = otomatik, null/eksik = değiştirme
  "seoDescription": ""     // en çok 320 karakter; sunucu KIRPMAZ (ön yüz 155 üstünü uyarır). Başlık en çok 100.
}
```

- **Tam yazımdır**: metin alanlarının hepsini gönderin (`editor.draft`'tan doldurup değişeni değiştirin). Eksik liste boş
  sayılır. `regionDetails` gönderilmezse bölüm açıklamaları silinir (fotoğraflar kalır). Fotoğraflar bu uçla değişmez.
- Doğrulama kuralları eski formla aynıdır (`SiteTextsValidator`). Örnekler: Instagram adresi `https://` ile başlar,
  haftalık saatte 7 gün yer alır, en çok 3 yorum.

### Sürüm ve çatışma (409)

- Her yanıt güncel `version`'ı taşır. İstemci **her yanıttan sonra** `version`'ı günceller.
- Kaydet, Geri al, Yayınla ve At istekleri `version` gönderir. Sunucudaki sürüm farklıysa hiçbir şey yazılmaz ve şu döner:

  ```json
  409 { "error": "Site başka bir oturumda da düzenlendi. Son hâli yükleyip tekrar deneyin.", "editor": { /* güncel SiteEditor */ } }
  ```

  Ön yüz "Başkası da düzenledi" uyarısını gösterir. "Son hâli yükle" düğmesi `editor`'u kullanır; istenirse yerel
  değişiklik yeniden uygulanıp yeni sürümle tekrar kaydedilir.
- **Fotoğraf uçları sürüm denetlemez.** Bunlar tek alanlık işlemlerdir ve son yazan kazanır. Ama sürümü artırır ve yeni
  sürümü döner. Bu yüzden ön yüz kaydetmeleri **sırayla** yapmalıdır (aynı anda tek istek, ör. bir kuyruk). Yoksa bir
  fotoğraf yüklemesi sürerken gönderilen metin kaydı kendi oturumuyla çatışır.
- Değişiklik yokken Yayınla bir şey yapmaz (denetim kaydı da yazılmaz).

### Fotoğraf akışları

| İşlem | Çağrı | Sonuç |
|---|---|---|
| Kendi fotoğrafını yükle | `POST …/image/cover` (multipart `file`) | Taslağın kapağı değişir. Önceki taslak yüklemesi (yayında değilse) silinir. |
| Hazır görsel seç | `GET api/stock-images?q=mangal` → `POST …/image/cover/stock { stockImageId }` | Taslak paylaşılan anahtarı gösterir. Dosya kopyalanmaz. |
| Fotoğrafı kaldır | `DELETE …/image/cover` | Taslakta boş. Kapak boşken site menü fotoğraflarından kolaj çizer. |
| Galeri ekle / değiştir / sil / sırala | `POST …/gallery`, `POST …/gallery/stock`, `?index=N`, `DELETE …/gallery/{i}`, `PUT …/gallery/order` | Galeri en çok 12. Sınır yüklemeden önce denetlenir. |
| Bölüm fotoğrafı | `…/regions/{id}/image` (+ `/stock`, DELETE) | |
| Paylaşım görseli | `…/image/share` (+ `/stock`, DELETE) | DELETE = otomatiğe dön (kapak). |
| Alt sayfa kapağı | `…/image/hero-menu` (+ `/stock`, DELETE); `hero-hakkimizda`, `hero-mekan`, `hero-iletisim`, `hero-rezervasyon` | DELETE = sitenin kapağına dön. Yükleme 2000 px. |
| Yayınla | `POST …/publish { version }` | Yayından kalkan restoran dosyaları silinir; `shared/` asla. Denetim kaydı `SitePublished` ("… N değişikliği yayınladı (Kapak fotoğrafı, Alt başlık)."). |
| Değişiklikleri at | `POST …/discard { version }` | Yalnız taslağa yüklenmiş dosyalar silinir. Denetim kaydı `SiteDraftDiscarded`. |
| Alanı geri al | `POST …/revert { version, fields }` | Alan yayındaki değerine döner. Taslağa yüklenmiş dosya kullanılmaz olursa silinir. |

"Önizle" yalnız ön yüzde yapılır: site bileşenleri `editor.draft` ile çizilir. Müşteriye açık uçlar taslağı asla dönmez.

---

### Alt sayfa kapakları

Menü, Hakkımızda, Mekân, İletişim ve Rezervasyon sayfalarının her biri kendi kapak fotoğrafını alabilir. Boşsa eskisi gibi
sitenin kapağı kullanılır; Mekân'da sıra: kendi kapağı → ilk mekân fotoğrafı → hikâye fotoğrafı → kapak.

- Depolama: `SiteContent` jsonb'sine beş anahtar (`MenuHero`, `AboutHero`, `VenueHero`, `ContactHero`, `ReservationHero`).
  Yeni sütun ve migration yok; eski kayıtlarda anahtar yoktur ve boş sayılır.
- Domain: `SiteImageSlot.MenuHero … ReservationHero` (5–9), `SiteContent.WithHeroImage`, `SiteSnapshot.HeroFields`.
  `ImageKeys` bu anahtarları da sayar: silme kuralı (ne yayında ne taslakta kullanılan silinir, `shared/` asla) aynıdır.
- Değişen alanlar: `heroMenu` "Menü kapağı", `heroAbout` "Hakkımızda kapağı", `heroVenue` "Mekân kapağı",
  `heroContact` "İletişim kapağı", `heroReservation` "Rezervasyon kapağı"; alan bazında "Geri al" çalışır.
- DTO: `BranchSiteDto.MenuHeroUrl … ReservationHeroUrl` (taslak, yayındaki ve `api/public/site`).
- Testler: `SiteDraftHandlerTests` (taslak → yayın, hazır görsel, iki kez yükleme, geri al, at) ve `SiteSnapshotTests`.

### Sık sorulanlar (gizlenen sorular) ve yeni olanaklar

İletişim sayfasındaki "Sık sorulanlar" restoranın yazdığı metin değildir: sorular ve cevaplar ön yüzde, restoranın
ayarlarından (rezervasyon kuralları, teslimat mahalleleri, ödeme yolları, mekân olanakları) oluşur. Her soru varsayılan
olarak açıktır; restoran istemediğini gizler. Sunucu yalnız gizlenenlerin anahtarlarını saklar:

- `SiteContent.HiddenFaqs` (jsonb içerik, yeni sütun/migration yok; eski kayıtlarda anahtar yok = boş = hepsi görünür).
- Doğrulama: en çok 30 anahtar; her biri `^[a-z0-9-]{1,40}$`; kırpılır, küçük harfe çevrilir, tekrar atılır (sıra korunur).
  Sunucu soru listesini bilmez: bilinmeyen anahtar da kabul edilir (soru ön yüzden kalkınca zararsız kalır).
- PUT gövdesinde `hiddenFaqs`; `null`/eksik = değiştirme (eski form göndermez). Taslak/yayın/geri al alanı `hiddenFaqs`
  ("Sık sorulanlar", sayfa "İletişim"). `BranchSiteDto.HiddenFaqs` taslakta, yayındakinde ve `api/public/site`'ta döner.
- Ön yüzdeki anahtarlar: `rezervasyon`, `rezervasyon-sorgula`, `teslimat-bolgeleri`, `siparis-takip`, `odeme` ve olanak
  soruları (`otopark`, `engelli`, `cocuk`, `evcil`, `wifi`, `vejetaryen`, `kartla-odeme`, `acik-alan`, `canli-muzik`,
  `sigara-alani`, `ozel-gun`). Olanak sorusu yalnız olanak işaretliyse ("Evet, …") görünür; işaretli değilse cevabı
  bilinmediği için soru hiç çizilmez ("hayır" denmez).

`SiteContent.AmenityKeys` sonuna dört olanak eklendi (ön yüzdeki `SITE_AMENITIES` ile aynı sıra): `bebek-sandalyesi`,
`aile-salonu`, `sigara-alani`, `ozel-gun`. Mekân sayfasındaki "Özel günler" kutusu yalnız `ozel-gun` işaretliyken görünür.

### Tasarım (`design`) ve renk teması

Restoran önce sitenin **tasarımını**, sonra o tasarımın içinde **rengini** seçer. İkisi ayrı alanlardır:

| Alan | Değerler | Anlamı |
|---|---|---|
| `design` | `renkli` · `sade` · `""` | Sayfa düzeni, yazı tipi ve kutu renkleri. `""` = varsayılan (`renkli`). |
| `theme` | `terracotta` … `beyaz` · `""` | Tasarımın içindeki renk (vurgu; Renkli'de ayrıca kapak zemini). |
| `accentColor` | `#RRGGBB` · `""` | Özel vurgu rengi; iki tasarımda da okunurluğa göre ayarlanır. |

- **Renkli ve sıcak** (`renkli`): kum zemin, krem kutular, Fraunces, renkli kapak, zeytin/hardal/kiremit kutular, zeytin alt bilgi.
- **Sade** (`sade`): krem zemin (#F6F1E9), beyaz kutular, Instrument Serif, beyaz kapak kutusu, açık kum alt bilgi.
- Saklama: `SiteContent.Design` (jsonb içerik; yeni sütun/migration yok, eski kayıtlarda anahtar yok = boş = renkli).
  `SiteContent.DesignKeys` ön yüzdeki `SITE_DESIGNS` ile aynıdır.
- Doğrulama: kırpılır, küçük harfe çevrilir; bilinmeyen anahtar `400 "Geçersiz site tasarımı."`.
- PUT gövdesinde `design`; `null`/eksik = değiştirme (eski form göndermez). Taslak/yayın/geri al alanı `design`
  ("Tasarım", sayfa "Tema"). `BranchSiteDto.Design` taslakta, yayındakinde ve `api/public/site`'ta, sipariş takibinde
  (`DeliveryTrackingDto.Design`) döner.
- Ön yüz: `pages/public/site/siteTheme.ts` → `siteRootStyle(accent, theme, design)` tasarımın paletini, yazı tipini
  ve kutu renklerini CSS değişkeni olarak verir; düzeni farklı olan birkaç parça `useSiteDesign()` ile dallanır.
- Testler: `SiteContentHandlerTests` (doğrulama, eski formun alanı koruması) ve `SiteDraftHandlerTests`
  (taslak → geri al → yayınla, temadan bağımsız).

## 3. Google ve paylaşım: otomatik değerler

Kod: `Application/Features/CustomerSite/Seo/SiteSeo.cs`.

| Değer | Girilmişse | Otomatik |
|---|---|---|
| Restoran adı | – | Şirket adı (`Company.Name`, Ayarlar). Boşsa şube adı. |
| Başlık | `seoTitle` | `"<Restoran adı> · <ilçe>"`. İlçe yoksa yalnız ad. Örnek: `Ocak · Kadıköy`. |
| Açıklama | `seoDescription` | `"<alt başlık> · <ilçe> · <saatler>"`. Alt başlık boşsa site başlığı kullanılır. Boş parçalar atlanır. **Kırpılmaz.** İkisi de boşsa: `"<ad> · <ilçe> · <saatler> · Menü, saatler ve iletişim"`. |
| Saat satırı | – | Haftalık saatte aynı aralıktaki ardışık günler birleşir, kapalı günler yazılmaz: `Her gün 08:00–23:00`, `Salı–Pazar 12:00–23:00`, `Pazartesi–Cuma 09:00–22:00, Cumartesi–Pazar 10:00–00:00`. Açılış = kapanış: `24 saat açık`. Haftalık saat yoksa tek aralık (`OpensAt`/`ClosesAt`); o da yoksa boş. |
| Paylaşım görseli | `shareImage` | Kapak fotoğrafı. Kapak yoksa ilk mekân fotoğrafı. O da yoksa görsel etiketi yazılmaz. |
| Alt sayfa başlığı | – | `"<Sayfa> · <Restoran adı>"`: Menü, Hakkımızda, Mekân, İletişim, Rezervasyon, Paket sipariş. Anasayfa sitenin başlığını alır. |

Logo/favicon: şirkette ya da şubede logo alanı yok. Sunucu favicon'a dokunmaz; baş harfli favicon ön yüzün işidir.

`GET api/public/site` artık `seo: { title, description, shareImageUrl }` alanını da döner. Bunlar YAYINDAKİ geçerli
değerlerdir. Site sayfaları `document.title` için bunu kullanabilir; alt sayfalar `"Menü · " + ad` kuralını izler.
`site.seoTitle` / `site.seoDescription` / `site.shareImageUrl` ham değerlerdir (boş = otomatik).

---

## 4. Sunucu tarafı etiketler (meta injection)

**Uç:** `GET api/public/site-html?path=/menu` (girişsiz, rate limit `public-html`: IP başına dakikada 300).

1. `ISiteIndexHtmlSource` ön yüzün derlenmiş `index.html`'ini getirir (`Infrastructure/Services/SiteIndexHtmlSource.cs`).
   - `Seo:IndexHtmlUrl` (üretim: `http://frontend/index.html`, compose ağı). Her istekte `If-None-Match`/ETag ile
     doğrulanır. Dosya değişmediyse ön yüz nginx'i 304 döner ve bellekteki kopya kullanılır. Ön yüz yeniden yayınlanınca
     yeni asset adlarıyla gelen dosya hemen alınır. Önbellekte kalan eski bir `index.html` silinmiş asset'lere işaret edip
     siteyi kırmaz. Timeout 3 sn. Hata olursa son iyi kopya kullanılır.
   - `Seo:IndexHtmlPath`: yerelde dosyadan okur (değiştirilme zamanına göre önbellek).
   - Hiçbiri yoksa ya da hiç kopya alınamadıysa uç **503** döner. nginx bu durumda isteği doğrudan ön yüze verir.
     Betikleri olmayan "asgari şablon" bilerek kullanılmadı: insanlara boş sayfa gösterirdi.
2. Restoran, diğer public uçlarla aynı yoldan çözülür: `X-Restaurant-Slug` başlığı (`TenantResolverService`); yerelde
   başlık yoksa `Tenancy:DevDefaultSlug`. Şirketin en eski şubesi kullanılır.
3. Değerler **YAYINDAKİ** siteden gelir (taslak asla). `SiteMetaHtml.Inject` yalnız `<head>`'i değiştirir:
   - Eski `<title>`, `description`, `robots`, `canonical`, `og:*` ve `twitter:*` etiketleri çıkar.
   - Yerine `title`, `description`, `og:type/site_name/locale/title/description/url/image`, `twitter:card` gelir
     (`summary_large_image`; görsel yoksa `summary`). Ayrıca `twitter:title/description/image` ve canonical yazılır.
   - Her değer HTML-kodlanır (`HtmlEncoder`, Türkçe harfler okunur kalır).
   - Betikler, stiller, favicon, theme-color ve `<body>` olduğu gibi kalır.
4. Kişisel bağlantılara `<meta name="robots" content="noindex">` yazılır ve canonical yazılmaz: `/rezervasyon/:token`,
   `/rezervasyon-sorgula`, `/siparis/takip/:token`, `/masa/:id`. Bilinmeyen yollar da bu kurala girer.
5. **Asla 500 yok:** slug yoksa, şirket ya da şube bulunamazsa ya da etiket yazarken bir hata olursa `index.html`
   **değiştirilmeden** 200 ile döner. Yanıtta `Cache-Control: no-cache` vardır.

Canonical / `og:url`: `https://{slug}.{Seo:RootDomain}{yol}`. `RootDomain` varsayılanı `sophram.com`, sorgu dizesi atılır.

### Üretim değişiklikleri (sunucuya dokunulmadı, deploy sırasında yapılacak)

**docker-compose.yml** (repoda yapıldı): API ortamına eklendi:

```yaml
      - Seo__IndexHtmlUrl=${SEO_INDEX_HTML_URL:-http://frontend/index.html}
      - Seo__RootDomain=${SEO_ROOT_DOMAIN:-sophram.com}
```

API ve frontend aynı compose ağındadır. `frontend` servis adı konteynerin 80. portundaki nginx'e çözülür. Bu ayar tek
başına bir şeyi değiştirmez; trafiği değiştiren host nginx'idir.

**Host nginx** (`/etc/nginx/sites-enabled/sophram`). Önce yedek alın:
`cp /etc/nginx/sites-enabled/sophram /root/backups/nginx-sophram-$(date +%Y%m%d-%H%M).conf`.

1. Dosyanın en üstüne, `server` bloklarının **dışına** ekleyin (sites-enabled dosyaları `http` bağlamına dahil edilir):

```nginx
# Restoran alt alan adı → slug. Çıplak sophram.com ve www boş kalır (Sophram'ın kendi etiketleri).
map $host $sophram_slug {
    default              "";
    "www.sophram.com"    "";
    "~^(?<sophram_sub>[a-z0-9-]+)\.sophram\.com$" $sophram_sub;
}
```

2. 443 `server` bloğunda (sophram.com ve *.sophram.com), mevcut `location /` bloğunun **üstüne** ekleyin. `/api/` ve hub
   blokları aynen kalır:

```nginx
    # Restoran sitesinin SAYFA açılışları: başlık/og etiketleri API'de yazılır. Yalnız bilinen sayfa yolları eşleşir;
    # nokta içeren yollar (/assets/*.js, /favicon.svg, /robots.txt...) ve personel ekranları eskisi gibi ön yüze gider.
    location ~ ^/((menu|hakkimizda|mekan|iletisim|rezervasyon|rezervasyon-sorgula|siparis|masa)(/[^.]*)?)?$ {
        error_page 418 = @sophram_spa;
        if ($sophram_slug = "") { return 418; }       # çıplak alan adı: landing, Sophram etiketleri

        proxy_pass http://127.0.0.1:8080/api/public/site-html?path=$request_uri;
        proxy_set_header Host $host;
        proxy_set_header X-Restaurant-Slug $sophram_slug;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_read_timeout 5s;

        # API kapalı, index.html alınamadı (503) ya da rate limit (429): sayfa etiketsiz ama çalışır hâlde ön yüzden gelir.
        proxy_intercept_errors on;
        error_page 404 429 500 502 503 504 = @sophram_spa;
    }

    location @sophram_spa {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

Notlar:

- `proxy_pass` içinde değişken olduğu için nginx yolu kendisi eklemez. `$request_uri` ham hâliyle `path=` değerine
  gider; sorgu dizesi API'de atılır.
- Regex location'da URI'li `proxy_pass` ancak değişkenle yazılabilir; bu yüzden `$request_uri` kullanıldı.
- `nginx -t && systemctl reload nginx`. Sonra kontrol edin:
  - `curl -s https://ocak.sophram.com/menu | grep -E "<title>|og:"` restoranın etiketlerini göstermeli.
  - `curl -s https://sophram.com/ | grep "<title>"` Sophram başlığı kalmalı.
  - `curl -sI https://ocak.sophram.com/assets/<dosya>.js` 200 dönmeli (ön yüzden).
  - Tarayıcıda siteyi açıp konsolu kontrol edin.
- Önizleme testi: <https://www.opengraph.xyz/>, Facebook Sharing Debugger, WhatsApp'ta bağlantıyı yeni bir sohbete
  yapıştırın (WhatsApp önizlemeyi önbelleğe alır).

### Yerelde deneme

Önce API'yi `Seo__IndexHtmlPath=../../frontend/index.html` ile başlatın (çalışma dizini `Backend/RestaurantBill.WebAPI`).
Ya da `appsettings.Development.json` dosyasına `"Seo": { "IndexHtmlPath": "../../frontend/index.html" }` yazın. Sonra:
`curl "http://localhost:5077/api/public/site-html?path=/menu"`. Slug `Tenancy:DevDefaultSlug`'dan ya da
`-H "X-Restaurant-Slug: demo"` başlığından gelir. Vite geliştirme sunucusu (5173) bu ucu kullanmaz; yalnız üretim
nginx'i kullanır.

---

## 5. Eski uçlar

| Eski uç (yayına doğrudan yazar) | Yeni düzenleyicideki karşılığı |
|---|---|
| `GET api/branch/site` | `GET api/branch/site/draft` (`published` alanı aynı şekil) |
| `PUT api/branch/site` | `PUT api/branch/site/draft` |
| `POST/DELETE api/branch/site/image/{cover\|about\|founder}` | `…/site/draft/image/{slot}` (+ `/stock`, `share`) |
| `POST api/branch/site/gallery`, `DELETE …/gallery/{i}`, `PUT …/gallery/order` | `…/site/draft/gallery…` |
| `POST/DELETE api/branch/site/regions/{id}/image` | `…/site/draft/regions/{id}/image…` |
| `GET api/branch/site/completeness` | değişmedi (yayındaki siteyi puanlar, bkz. açık konular) |

Eski uçlar ön yüz geçene kadar çalışır. Ancak taslak varken eski formla yapılan bir değişiklik bir sonraki Yayınla'da
taslaktaki değerle ezilir. Ön yüz düzenleyiciye geçince eski uçlar (`BranchController` "restaurant site" bölgesi ve
`BranchSite.cs`'teki eski komutlar) kaldırılabilir.

---

## 6. Açık konular

- **Açıklamadaki adres:** Tasarımdaki örnek açık adresi kullanıyor ("Moda Cd. 48, Kadıköy · Salı–Pazar…"). Brief yalnız
  ilçe istedi; otomatik açıklama şu an `alt başlık · ilçe · saatler`. Adres de istenirse `SiteSeo.AutoDescription`'da
  tek satırlık değişiklik yeter.
- **Kenar çubuğundaki turuncu nokta:** Hafif bir uç yok. Şimdilik `GET api/branch/site/draft` → `hasChanges` kullanılır.
  Gerekirse `/me` ya da sayaçlar ucuna `siteHasDraft` eklenebilir.
- **"Sitenizi güzelleştirin" puanı** yayındaki siteyi puanlar, taslağı değil. Düzenleyicide taslağa göre görünmesi
  istenirse `SiteCompleteness.Evaluate` snapshot alacak şekilde değiştirilmeli.
- **Çok şubeli şirket:** Etiketler şirketin en eski şubesinden gelir (public site varsayılanıyla aynı). `?branchId=` ile
  açılan şube sayfası için ayrı etiket yok.
- **Fotoğraf uçlarında sürüm denetimi** yok (yukarıda anlatıldı). İstenirse `?version=` eklenebilir.
- **Taslakta silinmiş bölüm:** Bölüm silinirse taslak/yayındaki `region:{id}` kaydı kalır ve sitede görünmez.
  Değişikliklerde "Silinmiş bölüm" diye listelenebilir.
- **Eski formla birlikte kullanım** (geçiş dönemi): yukarıdaki "Eski uçlar" notu.
- **Uçtan uca test yapılmadı:** üretim nginx'i ve gerçek WhatsApp/Google önizlemesi denenmedi. Testler: domain ve
  handler testleri, HTML enjeksiyonu birim testleri.
