# Site tasarımları: kayıt (registry)

Bir tasarım iki parçadan oluşur:

1. **Renk ve yazı** (`site/siteTheme.ts`): `SitePalette`, temalar (`*_THEMES`), `SITE_DESIGNS` kaydı. Sayfalar renkleri
   yalnız `--site-*` değişkenlerinden okur; tema ve vurgu rengi seçicisi her birleşimde çalışsın diye **bileşenlerde renk
   sabit yazılmaz**.
2. **Düzen** (bu klasör): tasarımın kendi sayfaları, üst menüsü, alt bilgisi ve menü sunumu. Yazılmayan her parça ortak
   bileşene düşer (Renkli, Sade ve Sıcak'ın paylaştığı düzen). Tasarım yalnız değiştirdiğini yazar.

## Dosyalar

- `designTraits.ts` — **veri** özellikleri (bileşen yok; her yerden döngüsüz okunur):
  - `menuVariant`: ortak menünün (`delivery/DeliveryMenu.tsx`) sunumu: `'default'` kart, `'meyhane'`, `'esnaf'`. Site Menü
    sayfası, **masa QR menüsü** ve **paket sipariş menüsü** bunu `lineMenuVariant(design)` ile alır; bu sayfalara dokunmadan
    satır ve kategori başlığı tasarıma göre değişir.
  - `flowClass`: akış sayfalarının kökündeki giydirme sınıfı (Elit: `rb-el-flow`).
  - `mobileBar`: telefon alt çubuğu düğmeleri `'pill'` (varsayılan) ya da `'square'` (Elit).
- `registry.ts` — **bileşenler**: `designLayout(design)` tasarımın `{ ...özellikler, ...bileşenler }`ini döndürür.

| Alan | Nerede kullanılır | Yoksa |
|---|---|---|
| `Home` (`{ site, mine }`) | `RestaurantSitePage` (/) | ortak ana sayfa |
| `Menu`, `About`, `Contact`, `Venue` (`{ site }`) | /menu, /hakkimizda, /iletisim, /mekan | ortak sayfa |
| `Reservation` (`{ site }`) | /rezervasyon | ortak sayfa (Elit kapağıyla) |
| `Header` (`{ site, current, sticky, overlay }`) | `SiteFrame.SiteHeader`: site sayfaları + paket sipariş/takip üst menüsü | `ClassicHeader` |
| `Footer` (`{ site, bottomBar, visit }`) | `SiteFrame.SiteFooter`: site sayfaları + takip | `ClassicFooter` |
| `flowCss` | `SitePage` kökünde `<style>` | yok |

Sayfa bileşeni kendi `SitePage`ini çizer (üst menü, alt bilgi, telefon alt çubuğu oradan gelir). Düzenleyici önizlemesinde
(`useSiteEdit()` dolu) üst menü ve alt bilgi çizilmez; `EditableText` / `EditableBlock` / `ListCard` ile alanlar yerinde
düzenlenir: yeni sayfada da bunları kullanın (ortak sayfalardaki örneklere bakın).

## Yeni tasarımın düzenini eklemek (ör. Esnaf Tabelası)

1. `designs/esnaf/` klasörünü açın; yalnız farklı olan sayfaları yazın (`EsnafHome.tsx` …). Ortak parçaları
   (`ReservationFlow`, `ContactForm`, `DeliveryMenu`, `aboutStats`, `visibleFaqs`, `weekSchedule` …) yeniden kullanın.
2. `registry.ts` içindeki `LAYOUTS`'a ekleyin: `esnaf: () => ({ Home: EsnafHome, Header: EsnafHeader, ... })`.
   Bileşenler `function` bildirimi olsun (modüller döngülü; kayıt ilk çizimde okunur).
3. Menü sunumu değişecekse `designTraits.ts`'e `menuVariant` ekleyin ve `DeliveryMenu.tsx`'te o dalı yazın (Meyhane'nin
   `MeyhaneCategoryHeader` + `MezeTray` dalı örnek). Masa QR ve paket sipariş sayfaları kendiliğinden alır.
4. Tasarıma özgü desen, ışık, kenar gibi CSS'i `site/siteThemes.css`'te `[data-site-design=<anahtar>]` altına yazın;
   renkler yine `var(--site-*)`.
5. Admin'deki tasarım küçük resmi `pages/admin/site/SiteSettingsEditors.tsx` (`*Mock`).
6. Denetim: her tema ve özel vurgu rengiyle bakın; telefon genişliği (360 px) önce; `pnpm lint` ve `pnpm build`.

## Örnek: Meyhane Gecesi (`designs/meyhane/`)

- `MeyhaneFrame.tsx`: ortada tabela adlı üst menü (kapakta saydam), adisyon fişi alt bilgi.
- `MeyhaneHome.tsx`: tam genişlik gece kapağı + lamba dizisi + "Bu akşam açığız" şeridi, meze tepsisi, basılı menü
  sütunları, hazır menüler, kemerli hikâye, masalardan notlar, "Masa ayırt" bandı.
- `MeyhaneMenu.tsx`, `MeyhaneAbout.tsx`, `MeyhaneContact.tsx`, `MeyhaneReservation.tsx`: kendi sayfaları (Mekân ortak).
- `MezeTray.tsx`, `MeyhaneMenuParts.tsx`: ortak menünün Meyhane dalı (site, QR, paket sipariş).
- `MeyhaneBits.tsx`, `meyhaneParts.ts`: lamba dizisi, gece zemini, şerit, süs, düğme sınıfları.

## Örnek: Esnaf Tabelası (`designs/esnaf/`)

- `EsnafFrame.tsx`: dükkân tabelası üst menü (dev ad, büyük telefon, sarı Sepet, çini şerit, altında sayfa plakaları),
  çinili tezgâh alt bilgi (gün gün saat panosu, "Yine bekleriz").
- `EsnafHome.tsx`: tabela kapak + "Bugün ne yesek?" panosu, "Nasıl istersiniz?" seçim kutuları (Eve gelsin yalnız online
  sipariş açıkken), vitrin fotoğrafı, sarı ilan hazır menüler, fiyat panoları duvarı, Ustamız + kuruluş mührü, müşteri
  defteri, "Buyurun" bandı.
- `EsnafMenu.tsx`, `EsnafAbout.tsx`, `EsnafContact.tsx`, `EsnafReservation.tsx`: kendi sayfaları (Mekân ortak).
- `EsnafMenuParts.tsx` + `esnafParts.ts` (`ESNAF_BOARD_WALL`, `esnafPanelClass`, `esnafTabClass`): ortak menünün Esnaf
  dalı: her kategori çini kenarlı pano, panolar kapsayıcı genişliğine göre (container query) 1–3 sütun.
- `EsnafBits.tsx`, `esnafActions.tsx`: çini şerit, "Şu an açık" satırı, pano satırı, mühür, "Buyurun" bandı; telefon
  alt çubuğu (Ara · Sipariş ver). Desenler `siteThemes.css`'te `rb-es-*`.

Henüz kayda taşınmayanlar (Elit'e özgü, dağınık kalan): `RestaurantReservationPage`, `ReservationLookupPage`,
`DeliveryTrackingPage`, `TableOrderPage`, `DeliveryOrderPage`'deki `=== 'elit'` dalları (başka dallarda da değişen
dosyalar; dokunmamak için bırakıldı).

## Örnek: Bahçe Kahvaltısı (`designs/bahce/`)

- `BahceFrame.tsx`: yüzen yuvarlak kapsül üst menü (güneş işareti, ad, bugünün saat çipi), çalı kenarlı yeşil alt bilgi.
- `BahceHome.tsx`: yukarıdan bakılmış sofra kapağı (`Sofra.tsx`: kapak renginde masa, fotoğraflı ya da çizimli tabaklar),
  "Sofranın yıldızı" hazır menü kartı, kareli örtüde "Bugün masada", damla fotoğraflı hikâye, notlar, hafta sonu kartı.
- `BahceMenu.tsx`, `BahceAbout.tsx`, `BahceContact.tsx`, `BahceReservation.tsx`: kendi sayfaları (Mekân ortak).
- `BahceMenuParts.tsx`: ortak menünün Bahçe dalı (tabak simgeli başlık, yuvarlak tabaklı kartlar; site, QR, paket sipariş).
- `BahceBits.tsx`, `bahceParts.ts`: çizimli tabaklar, saat çipi, hafta sonu saatleri (rezervasyon ayarından), düğmeler.
