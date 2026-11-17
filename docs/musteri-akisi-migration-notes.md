# Müşteri akışı (QR, masa menüsü, paket, takip, rezervasyon) — şema notları

## Migration: `AddCustomerFlowFields`

Tek bir ek sütun; nullable, varsayılanı `NULL`, SQL ya da veri doldurma yok.

| Sütun | Tip | Varsayılan | Amaç |
| --- | --- | --- | --- |
| `Tables.Capacity` | `integer` | `NULL` | Masaya en fazla kaç kişi oturur (1–50). Rezervasyon akışındaki masa kartında "2–4 kişi" / "size dar" gösterilir; admin Masalar penceresinden girilir. Girilmemiş masa eskisi gibi her kişi sayısına açık görünür. |

Not: Migration oluşturulduğu anda restoran sitesi işinin `Branches.SiteContent` (jsonb) değişikliği de modelde bekliyordu.
O değişiklik bu migration'a **alınmadı** (migration'dan ve snapshot'tan elle çıkarıldı); kendi migration'ıyla gelecek.

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
