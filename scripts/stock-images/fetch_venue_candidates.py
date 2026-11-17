"""Mekân/kafe hazır görsel adayları (yalnız bağlantılar; indirme yok). Anahtar PIXABAY_API_KEY ortam değişkeninden."""
import json, os, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PER = 4

# (slug, başlık, grup, anahtar kelimeler, arama)
ITEMS = [
    ("mekan-salon", "Restoran salonu", "Mekân", ["salon", "restoran", "iç mekân"], "restaurant interior dining room"),
    ("mekan-aksam", "Akşam salonu", "Mekân", ["akşam", "loş", "atmosfer"], "restaurant interior evening warm light"),
    ("mekan-modern", "Modern restoran", "Mekân", ["modern", "restoran", "salon"], "modern restaurant interior"),
    ("mekan-rustik", "Rustik mekân", "Mekân", ["rustik", "ahşap", "salon"], "rustic restaurant wooden interior"),
    ("mekan-ocakbasi", "Ocakbaşı", "Mekân", ["ocakbaşı", "mangal", "kebapçı"], "grill restaurant charcoal fire"),
    ("mekan-lokanta", "Lokanta", "Mekân", ["lokanta", "esnaf lokantası", "salon"], "traditional restaurant tables"),
    ("mekan-cephe", "Restoran cephesi", "Mekân", ["cephe", "dış mekân", "giriş"], "restaurant facade entrance street"),
    ("mekan-isiklar", "Işıklar", "Mekân", ["ışık", "aydınlatma", "atmosfer"], "restaurant pendant lights interior"),
    ("kafe-ic", "Kafe içi", "Kafe", ["kafe", "iç mekân", "kahve"], "cafe interior cozy"),
    ("kafe-tezgah", "Kafe tezgâhı", "Kafe", ["tezgâh", "kafe", "barista"], "coffee shop counter"),
    ("kafe-barista", "Barista", "Kafe", ["barista", "espresso", "kahve"], "barista making coffee espresso machine"),
    ("kafe-latte", "Latte sanatı", "Kafe", ["latte", "kahve", "köpük"], "latte art coffee cup"),
    ("kafe-pastane", "Pastane vitrini", "Kafe", ["pastane", "vitrin", "tatlı"], "bakery display pastries"),
    ("kafe-firin", "Fırın", "Kafe", ["fırın", "ekmek", "simit"], "bakery bread shelves"),
    ("kafe-pencere", "Pencere kenarı", "Kafe", ["pencere", "kafe", "masa"], "cafe window seat"),
    ("kafe-kitap", "Kitap kafe", "Kafe", ["kitap", "kafe", "sakin"], "book cafe reading coffee"),
    ("teras-aksam", "Teras akşamı", "Teras ve bahçe", ["teras", "akşam", "açık hava"], "restaurant terrace evening"),
    ("teras-bahce", "Bahçe", "Teras ve bahçe", ["bahçe", "açık hava", "yeşil"], "garden restaurant outdoor tables"),
    ("teras-deniz", "Deniz manzarası", "Teras ve bahçe", ["deniz", "manzara", "teras"], "seaside restaurant terrace sea view"),
    ("teras-sokak", "Sokak masaları", "Teras ve bahçe", ["sokak", "kaldırım", "açık hava"], "street cafe outdoor tables"),
    ("teras-avlu", "Avlu", "Teras ve bahçe", ["avlu", "taş", "bahçe"], "courtyard restaurant stone"),
    ("teras-isik", "Işıklı bahçe", "Teras ve bahçe", ["ışık", "bahçe", "gece"], "string lights outdoor dining night"),
    ("bar-mutfak-sef", "Şef", "Bar ve mutfak", ["şef", "mutfak", "aşçı"], "chef cooking kitchen"),
    ("bar-mutfak-mutfak", "Mutfak", "Bar ve mutfak", ["mutfak", "profesyonel", "ocak"], "professional restaurant kitchen"),
    ("bar-mutfak-alev", "Alevde pişirme", "Bar ve mutfak", ["alev", "tava", "pişirme"], "chef flambe pan fire"),
    ("bar-mutfak-firin", "Taş fırın", "Bar ve mutfak", ["taş fırın", "odun fırını", "pide"], "wood fired oven"),
    ("bar-mutfak-tabak", "Tabak hazırlığı", "Bar ve mutfak", ["sunum", "tabak", "şef"], "chef plating food"),
    ("bar-mutfak-bar", "Bar", "Bar ve mutfak", ["bar", "tezgâh", "içecek"], "bar counter bottles"),
    ("bar-mutfak-servis", "Servis", "Bar ve mutfak", ["garson", "servis", "tabak"], "waiter serving food restaurant"),
    ("masa-sofra-kurulu", "Kurulu masa", "Masa ve sofra", ["masa", "kurulu", "tabak"], "table setting restaurant"),
    ("masa-sofra-kalabalik", "Kalabalık sofra", "Masa ve sofra", ["sofra", "aile", "paylaşım"], "family dinner table food sharing"),
    ("masa-sofra-meze", "Meze sofrası", "Masa ve sofra", ["meze", "sofra", "rakı"], "meze table mediterranean"),
    ("masa-sofra-kahvalti", "Kahvaltı sofrası", "Masa ve sofra", ["kahvaltı", "serpme", "sofra"], "breakfast table spread"),
    ("masa-sofra-sarap", "Akşam yemeği", "Masa ve sofra", ["akşam yemeği", "mum", "şarap"], "dinner table candles"),
    ("masa-sofra-cay", "Çay masası", "Masa ve sofra", ["çay", "bardak", "masa"], "turkish tea table"),
    ("masa-sofra-kutlama", "Kutlama", "Masa ve sofra", ["kutlama", "doğum günü", "grup"], "celebration dinner friends"),
]


def search(key, q):
    url = "https://pixabay.com/api/?" + urllib.parse.urlencode({
        "key": key, "q": q, "image_type": "photo", "orientation": "horizontal",
        "safesearch": "true", "per_page": 10, "min_width": 1600,
    })
    req = urllib.request.Request(url, headers={"User-Agent": "stock-image-curation"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.load(r)
    return [{"pixabayId": h["id"], "preview": h["webformatURL"], "large": h["largeImageURL"],
             "pageUrl": h["pageURL"], "photographer": h.get("user") or "", "alt": h.get("tags") or ""}
            for h in data.get("hits", [])[:PER]]


def main():
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        sys.exit("PIXABAY_API_KEY yok")
    out = []
    for slug, title, group, kw, q in ITEMS:
        try:
            cands = search(key, q)
        except Exception as e:  # noqa
            print("HATA", slug, e)
            cands = []
        out.append({"slug": slug, "title": title, "group": group, "keywords": kw, "query": q, "candidates": cands})
        print(slug, len(cands))
        time.sleep(0.7)
    with open(os.path.join(HERE, "venue-candidates.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
