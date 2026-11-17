# Stock image library ("Hazır görseller")

Restaurants can pick a ready-made photo ("Adana", "Çay", "Lahmacun"…) for a product or set menu instead of uploading
their own. Each library photo is stored **once** on Bunny CDN under `shared/stock/`. A product or set menu that uses it
stores only that key in `ImageUrl`, so 100 restaurants using "Adana" still means one file.

Customer-facing pages (site menu, QR menu, delivery page) show a small "Temsili görsel" label on these images
(`isStockImage` in the public DTOs).

The library has two parts: **food** photos (dishes and drinks, for products and set menus) and **venue** photos
(interiors, cafes, terraces, bars, tables, for site photo slots). The picker opens on the part that fits: products and
set menus use `scope=food`, the site editor uses `scope=venue` (see [Venue photos](#venue-photos) and [API](#api)).

## Rules

- Anything under `shared/` belongs to everyone. **It is never deleted** when a product or set menu changes or removes
  its image, or is deleted. The check is `StorageKeys.IsShared(key)` (Domain); handlers delete old files only through
  `IImageStorageService.DeleteReplacedImageAsync(...)`, and `BunnyStorageService.DeleteAsync` refuses shared keys too.
- A restaurant's own uploaded file (`products/{branch}/...`) is still deleted when it is replaced by a stock image,
  exactly as when it is replaced by a new upload.
- The catalog is global (not per company or branch). Catalog keys must start with `shared/stock/`; `..`, `\` and `//`
  are rejected.

## Adding photos

1. **Prepare the file.** WebP, roughly 800 px on the long side (the same size uploads get), quality ~80, landscape or
   square. Use a lower-case ASCII file name: `shared/stock/adana-kebap.webp`, `shared/stock/cay.webp`. Check the license
   of every photo before uploading.
2. **Upload it to Bunny.** Bunny dashboard → Storage → the zone in `BunnyStorage:StorageZoneName` → create the folder
   `shared/stock/` (once) → upload. Or with the API:

   ```bash
   curl -X PUT "https://storage.bunnycdn.com/<zone>/shared/stock/cay.webp" \
     -H "AccessKey: <storage zone password>" -H "Content-Type: image/webp" \
     --data-binary @cay.webp
   ```

   Open `<CdnBaseUrl>/shared/stock/cay.webp` in a browser and make sure it loads.
3. **Add a row** to `Backend/RestaurantBill.Persistence/Seeds/stock-images.json` (embedded in the build):

   ```json
   [
     {
       "storageKey": "shared/stock/cay.webp",
       "title": "Çay",
       "keywords": ["çay", "demlik", "sıcak içecek"],
       "group": "İçecek",
       "sortOrder": 10
     }
   ]
   ```

   | Field | Required | Notes |
   |---|---|---|
   | `storageKey` | yes | Must start with `shared/stock/`. Rows are matched by this key; never change it once products use it. |
   | `title` | yes | Turkish, max 100 chars. Shown under the thumbnail. |
   | `keywords` | no | Search words. Stored lower-case. Search ignores Turkish letters/accents ("cay" finds "Çay"). |
   | `group` | no | Food: "Kahvaltı", "Kebap ve ızgara", "Sıcak içecek", "Tatlı"… Venue: one of the reserved names below, spelled exactly. Max 50 chars. |
   | `sortOrder` | no | Lower comes first in the default list (empty search). Default 0. |
   | `isActive` | no | `false` hides it from the picker. Products already using it keep showing it. Default `true`. |

4. **Deploy / restart the API.** On startup `StockImageSeed` syncs the file into the `StockImages` table: new keys are
   added, existing keys get the file's title, keywords, group, sort order and active flag. A row removed from the file
   is **not** deleted from the table (products may point to it): set `"isActive": false` instead. Invalid rows are
   skipped with a warning in the log; they never stop the API.

Only add a row after its file is on the CDN. A row without a file shows a broken image in the picker and on every
restaurant page that selects it.

## Venue photos

Venue/ambiance photos for restaurants and cafes without their own photos: site cover, about, venue page hero, gallery,
region (section) photos, page heroes, and founder / share image when picked from the library.

Reserved venue groups (`StockImageGroups.Venue` in `Application/Features/StockImages/StockImageGroups.cs`, mirrored by
`VENUE_STOCK_GROUPS` in `frontend/src/features/stockImages/api/stockImageService.ts`). The order below is the order of
the default venue list. Every other group counts as food.

| `group` | Contents | File names |
|---|---|---|
| `Mekân` | Restaurant hall, interior | `shared/stock/mekan-*.webp` |
| `Kafe` | Cafe interior, counter, coffee corner | `shared/stock/kafe-*.webp` |
| `Teras ve bahçe` | Terrace, garden, outdoor seating | `shared/stock/teras-bahce-*.webp` |
| `Bar ve mutfak` | Bar, open kitchen, grill, oven | `shared/stock/bar-mutfak-*.webp` |
| `Masa ve sofra` | Set tables, table details | `shared/stock/masa-sofra-*.webp` |

`*` is a short lower-case ASCII slug or number: `mekan-salon-aksam.webp`, `kafe-03.webp`. Group matching ignores case and
Turkish letters ("mekan" = "Mekân"), but write the names exactly as above. Venue photos are landscape (cover/hero use),
WebP, 2000 px on the long side (the size site cover and page-hero uploads get; gallery uploads get 1600), quality ~80. Use
`sortOrder` within a group to put the best photos first. Avoid recognizable people, logos, signs and brand names.

## API

| Method | Route | Roles | Body / query | Returns |
|---|---|---|---|---|
| GET | `api/stock-images?q=&scope=&group=` | Owner, Admin | all optional | `[{ id, title, group, url }]`, max 300 (thumbnails load lazily). Empty `q`: default list by `sortOrder`. Ranking: exact title, exact keyword, title/keyword word prefix, contains; multi-word queries (the picker opens with the product name, e.g. "Adana Kebap") fall back to per-word matches, most words first. `scope` and `group`: see below. |
| POST | `api/product/{id}/stock-image` | Owner, Admin | `{ stockImageId }` | full CDN url |
| POST | `api/set-menu/{id}/stock-image` | Owner, Admin | `{ stockImageId }` | full CDN url |

`scope` (case-insensitive; an unknown value is a 400):

| `scope` | Empty `q` | With `q` | Used by |
|---|---|---|---|
| omitted / `all` | All groups by `sortOrder` (as before) | Ranked over all groups | – |
| `venue` | Venue groups only, by group order (table above), then `sortOrder`, then title | Venue matches first (ranked), then the other matches (ranked); 300 in total | Site editor (`StockGrid`) |
| `food` | Venue groups excluded | Venue groups excluded | Product and set-menu picker (`StockImagePickerModal`) |

`group` keeps one group only ("Kafe"; case and Turkish letters ignored) and combines with `scope`. The site editor's
chips: Tümü (`scope=venue`) · Mekân · Kafe · Teras ve bahçe · Bar ve mutfak · Masa ve sofra (`scope=venue&group=…`) ·
Yemekler (`scope=food`, with the food groups as sub-chips). While no venue rows exist, Tümü and the venue chips show
"Mekân fotoğrafları yakında eklenecek…" with a button that switches to Yemekler.

Both commands are branch-scoped like the upload commands and write an audit log (`ProductStockImageSelected`,
`SetMenuStockImageSelected`). Nothing is uploaded or copied.

Restaurant site photos (cover, about, founder, share image, gallery, region photos) can use stock images too. Those
selections go into the site **draft**: `POST api/branch/site/draft/image/{slot}/stock`, `.../gallery/stock`,
`.../regions/{id}/image/stock`, all with `{ stockImageId }`. See `docs/site-editor.md`. The same rule applies: publishing
or discarding never deletes a `shared/` key. Public pages label site photos as "Temsili görsel" by URL (the address
contains `/shared/stock/`), not by a DTO flag.

## Catalog status

89 photos from Pixabay (free for commercial use, no attribution required) are on the CDN and in the seed file.
Candidates come from `scripts/stock-images/`: `candidates.json` lists 148 items (Turkish title, keywords, group, English
search query); `fetch_candidates.py` (needs `PIXABAY_API_KEY`) writes 5 candidates per item to
`candidates-results.json` (not committed). The 59 items with no usable photo (mostly Turkish dishes such as mantı,
İskender, künefe, pide) still need own photos or generated images.
