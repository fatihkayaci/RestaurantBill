# Restoran sitesi: içerik ve tema migration'ı

Migration: `20261116193912_AddRestaurantSiteContentAndTheme` (RestaurantBill.Persistence).

## Ne ekliyor

Tek bir sütun:

| Tablo | Sütun | Tür | Boş olabilir |
|---|---|---|---|
| `Branches` | `SiteContent` | `jsonb` | evet |

Ek olarak hiçbir sütun değişmiyor ve veri taşıma (backfill) yok. `NULL`, "hiç kaydedilmemiş" anlamına gelir. Bu durumda
`Branch.GetSiteContent()` boş içerik döner: tema boştur, site de varsayılan terracotta/krem paletini kullanır.
Eski restoranlar bu yüzden kendiliğinden yeni varsayılan temaya geçer.

## jsonb'nin şekli

Saklanan alan adları domain'den bağımsız ve sabittir. Eksik anahtar boş sayılır. Dönüştürücünün yeri
`Persistence/Configurations/BranchConfiguration.cs` dosyasındaki `SiteContentJson`.

```json
{
  "Theme": "terracotta | zeytin | lacivert | bordo | komur | beyaz | \"\"",
  "Gallery": ["site/....webp"],
  "Week": [{ "Day": 1, "Open": true, "Opens": "09:00", "Closes": "23:30" }],
  "Directions": "Kadıköy iskelesinden 12 dk yürüme.",
  "Whatsapp": "0532 000 48 48",
  "Amenities": ["avlu", "vale"],
  "Rating": 4.7, "ReviewCount": 1240, "ReviewsUrl": "https://...",
  "Reviews": [{ "Author": "Elif K.", "Text": "...", "Source": "Google" }],
  "FounderPhoto": "site/....webp", "FounderName": "...", "FounderTitle": "...", "FounderQuote": "...",
  "Founded": 1987,
  "Values": [{ "Title": "...", "Text": "..." }],
  "Milestones": [{ "Year": 1987, "Text": "..." }],
  "Regions": [{ "Id": "<regionId>", "Photo": "site/....webp", "Text": "..." }]
}
```

Bölüm fotoğrafı ve açıklaması `Regions` tablosunda değil, site içeriğinde bölüm kimliğiyle saklanır. Bu yüzden bölgeler
tablosu ve bölge ekranları değişmedi.

## Sınırlar (domain + FluentValidation)

- Galeri: en çok 12 fotoğraf (sitede 3 ve üstü önerilir).
- Yorum: en çok 3. Değer: en çok 3. Kilometre taşı: en çok 5.
- Puan 1–5 aralığında, tek ondalığa yuvarlanır. Bağlantılar `https://` ile başlamalı.
- Haftalık saat ya boş ("her gün aynı") ya da 7 farklı gündür, en az biri açık olmalı.
- Olanaklar yalnız hazır listeden seçilir (`SiteContent.AmenityKeys`).

## Geriye uyumluluk

- `OpensAt` / `ClosesAt` (tek aralık) korunur. Haftalık saat girilince bu iki alana açık günlerin en sık aralığı yazılır,
  böylece rezervasyon ve online sipariş varsayılanları çalışmaya devam eder.
- "Şu an açık" (`PublicSiteDto.IsOpenNow`) önce haftalık saate bakar, gece yarısını aşan aralıkları da hesaba katar.
  Haftalık saat yoksa tek aralığa bakar.
- `PublicSiteDto` yalnız alan ekledi (`Today`, `Site.*`, `Regions[].PhotoUrl/Description`). Hiçbir alan silinmedi.

## Kontrol

`dotnet ef migrations has-pending-model-changes` komutu "No changes have been made to the model since the last migration." diyor.
