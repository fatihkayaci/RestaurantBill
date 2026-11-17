# Müşteri akışı (QR, masa menüsü, paket, takip, rezervasyon) — şema notları

## Migration: `AddCustomerFlowFields`

Tek bir ek sütun; nullable, varsayılanı `NULL`, SQL ya da veri doldurma yok.

| Sütun | Tip | Varsayılan | Amaç |
| --- | --- | --- | --- |
| `Tables.Capacity` | `integer` | `NULL` | Masaya en fazla kaç kişi oturur (1–50). Rezervasyon akışındaki masa kartında "2–4 kişi" / "size dar" gösterilir; admin Masalar penceresinden girilir. Girilmemiş masa eskisi gibi her kişi sayısına açık görünür. |

Not: Migration oluşturulduğu anda restoran sitesi işinin `Branches.SiteContent` (jsonb) değişikliği de modelde bekliyordu.
O değişiklik bu migration'a **alınmadı** (migration'dan ve snapshot'tan elle çıkarıldı); kendi migration'ıyla gelecek.

## Migration: `AddSetMenuToOrderRequestItems` (masadan menü siparişi)

QR masa siparişi artık menü (set) kalemi de taşıyor. Mevcut satırlar ürün kalemi olarak kalır; veri doldurma yok.

| Sütun | Tip | Varsayılan | Amaç |
| --- | --- | --- | --- |
| `OrderRequestItems.ProductId` | `uuid` | — | Artık **nullable**: menü kaleminde boş. |
| `OrderRequestItems.SetMenuId` | `uuid` (FK → `SetMenus`, cascade) | `NULL` | Menü kalemi. Kalem ya ürün ya menüdür. |
| `OrderRequestItems.SelectionsJson` | `jsonb` | `'{}'` | Menüde bölüm Id → ürün Id (varsayılanlar dahil tüm bölümler); üründe `{}`. Paket siparişteki `DeliveryOrderLines.SelectionsJson` ile aynı biçim. |

`Down` önce menü kalemlerini siler (`ProductId IS NULL`), sonra `ProductId`'yi yeniden zorunlu yapar.

**İstek biçimi** (`POST api/public/order-requests`, `items[]`): paket sepet satırıyla (`CartLineInput`) aynı.

```json
{ "kind": "product", "productId": "…", "quantity": 2, "note": "az tuzlu" }
{ "kind": "setMenu", "setMenuId": "…", "quantity": 1, "note": "", "selections": [{ "slotId": "…", "productId": "…" }] }
```

`kind` verilmezse ürün sayılır (eski istemciler). Menü kalemi `OrderPricingService` ile doğrulanır (şube, menü aktif,
zorunlu bölüm seçimi, seçeneğin satışta/tükenmemiş olması); fiyat saklanmaz, ürünlerde olduğu gibi onayda güncel fiyat
yazılır. Onay (`ApplyRequestToTableOrder`) menüyü garsonun eklemesiyle aynı yoldan (`Order.AddSetMenu`) ekler: menü fiyatı +
seçim farkları, menü kategorisinin (yoksa şubenin) KDV'si, her seçim mutfağa giden bileşen kalemi. Ön sipariş
(rezervasyon) şimdilik yalnız ürün alır.

**Yanıt** (`GET api/order-request`, rezervasyon ön siparişleri): `OrderRequestItemDto`'ya `kind`, `setMenuId` ve
`selections` (seçimli bölümlerde seçilen ürün adları, ek ücret varsa "Kola (+₺10)") eklendi; `productId` menü kaleminde
`null`, `productName` menünün adıdır. `total`/`unitPrice` menüde seçim farklarını içerir.

## Şema değiştirmeyen eklemeler

- `OrderRequests.RejectReason` zaten vardı (C1). Artık personel reddederken neden yazabiliyor
  (`POST api/order-request/{id}/reject` gövdesi isteğe bağlı `{ reason }`, en fazla 300 karakter) ve müşteri
  `GET api/public/order-requests/{id}` yanıtında `rejectReason` olarak görüyor. Red artık denetim kaydı da yazıyor
  (`OrderRequestRejected`).
- `PublicProduct.isOutOfStock`: masa menüsü (`GET api/public/site`) ürünün "Tükendi" durumunu taşıyor; masadan gelen sipariş
  talebinde tükenmiş ürün varsa talep reddedilir (`CreateOrderRequest`), garsona hiç düşmez.
- `PublicTable.capacity`: `Tables.Capacity`.
- `TableActionResult.billTotal`: "Hesap iste" yanıtı masanın açık hesabında ödenecek kalanı (`Order.RemainingAmount`) döner.
- `DeliveryTracking`: `companyName`, `accentColor`, `coverImageUrl` (restoran sitesinin alanları) ve `acceptedAt`.
- `ReservationDetail.canCancel` + `cancelDeadline` ve yeni uç `POST api/public/reservations/cancel` `{ code, phone }`:
  misafir rezervasyonunu kendisi iptal eder. Kimlik "Rezervasyon sorgula" ile aynı (kod + telefon, aynı hatalı deneme kilidi
  ve `reservation-lookup` rate-limit). Yalnızca bekleyen/onaylı rezervasyon, saatinden 2 saat öncesine kadar
  (`Reservation.GuestCancelCutoff`). Bekleyen ön sipariş de iptal olur, denetim kaydı (`ReservationCancelledByGuest`) yazılır,
  personel ekranları `CustomerRequestsChanged` ile yenilenir.
