"""
Hazır görsel adaylarını Pixabay'den çeker (her ürün için birkaç seçenek).

Kullanım:
    PowerShell: $env:PIXABAY_API_KEY="..."
    python fetch_candidates.py        -> candidates-results.json

Hiçbir görsel indirilmez ya da yüklenmez; yalnızca adayların bağlantıları ve fotoğrafçı bilgisi yazılır.
Seçim yapıldıktan sonra yalnızca seçilen görseller indirilip CDN'e yüklenecek
(Pixabay kalıcı hotlink'e izin vermiyor, kendi sunucumuza almamız zaten isteniyor).
Pixabay sınırı: dakikada 100 istek; aralara bekleme konuldu.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

PER_ITEM = 5
HERE = os.path.dirname(os.path.abspath(__file__))


def search(api_key: str, query: str) -> list[dict]:
    url = "https://pixabay.com/api/?" + urllib.parse.urlencode({
        "key": api_key,
        "q": query,
        "image_type": "photo",
        "orientation": "horizontal",
        "category": "food",
        "safesearch": "true",
        "per_page": max(PER_ITEM, 3),  # Pixabay en az 3 ister
    })
    request = urllib.request.Request(url, headers={"User-Agent": "stock-image-curation"})
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.load(response)
    return [
        {
            "pixabayId": hit["id"],
            "preview": hit["webformatURL"],
            "large": hit["largeImageURL"],
            "pageUrl": hit["pageURL"],
            "photographer": hit.get("user") or "",
            "alt": hit.get("tags") or "",
        }
        for hit in data.get("hits", [])[:PER_ITEM]
    ]


def main() -> None:
    api_key = os.environ.get("PIXABAY_API_KEY")
    if not api_key:
        sys.exit("PIXABAY_API_KEY ortam değişkeni yok.")

    with open(os.path.join(HERE, "candidates.json"), encoding="utf-8") as f:
        items = json.load(f)

    results = []
    for index, item in enumerate(items, 1):
        try:
            photos = search(api_key, item["query"])
        except Exception as error:  # ağ ya da sınır hatası: ürünü boş geç, sonra tekrar denenebilir
            print(f"[{index}/{len(items)}] {item['slug']}: HATA {error}")
            photos = []
        print(f"[{index}/{len(items)}] {item['slug']}: {len(photos)} aday")
        results.append({**item, "photos": photos})
        time.sleep(0.7)

    with open(os.path.join(HERE, "candidates-results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    print("Yazıldı: candidates-results.json")


if __name__ == "__main__":
    main()
