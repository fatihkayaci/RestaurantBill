# Load Tests

k6 ile yazılmış performans testleri. Sistemin farklı yük seviyelerinde nasıl davrandığını ölçer.

## Kurulum

k6'nın yüklü olması gerekir:

```bash
# Windows (zip)
# https://github.com/grafana/k6/releases/latest adresinden k6-vX.X.X-windows-amd64.zip indir
# C:\k6\ klasörüne çıkart, PATH'e ekle
```

## Çalıştırma

API'nin ayakta olması gerekir (`docker compose up` veya `dotnet run`).

```bash
# Smoke test — sistem ayakta mı? (1 kullanıcı, 20 saniye)
k6 run load-tests/smoke.js

# Load test — normal yük altında performans (20 kullanıcıya kadar, 2 dakika)
k6 run load-tests/load-test.js

# Stress test — sistemin sınırlarını bul (100 kullanıcıya kadar, 2.5 dakika)
k6 run load-tests/stress-test.js
```

Farklı bir API adresi hedeflemek için:

```bash
k6 run -e BASE_URL=https://your-api.com load-tests/smoke.js
```

## Testler

### smoke.js
1 sanal kullanıcı, 20 saniye. Deployment sonrası sistemin ayakta olduğunu doğrular.

**Senaryo:** Login → Masa listesi → Ürün listesi → Mutfak siparişleri

**Threshold:**
- Hata oranı < %1
- p(95) yanıt süresi < 1 saniye

### load-test.js
0'dan 20 kullanıcıya kademeli artış, toplam 2 dakika. Normal iş yükü altında sistemi test eder.

**Senaryo:** Login → Masa listesi → Sipariş oluştur → Ürün ekle → Siparişi kapat

**Threshold:**
- Hata oranı < %5
- p(95) yanıt süresi < 2 saniye

### stress-test.js
0'dan 100 kullanıcıya kademeli artış, toplam 2.5 dakika. Sistemin kırılma noktasını bulur.

**Senaryo:** Login → Masa listesi → Ürün listesi → Mutfak siparişleri (okuma ağırlıklı)

**Threshold:**
- Hata oranı < %10
- p(95) yanıt süresi < 5 saniye

## Sonuçları Okuma

```
✓ 'p(95)<2000'  p(95)=1.46s   → threshold geçildi (iyi)
✗ 'p(95)<2000'  p(95)=2.95s   → threshold aşıldı (kötü)

http_req_duration: avg=479ms  p(90)=1.29s  p(95)=1.46s  max=8.48s
                   ^ortalama  ^%90 altında  ^%95 altında  ^en kötü istek
```

**p(95)** — isteklerin %95'inin bu sürenin altında tamamlandığını gösterir. Performans ölçümünde ortalama yerine p(95) kullanılır çünkü uç değerlerden etkilenmez.

## Bulgular ve Yapılan İyileştirmeler

### Load Test — Sipariş Kapatma Eklendi

**Sorun:** İlk load test çalıştırmasında p(95) = 2.95s çıktı, threshold (2s) aşıldı.

**Neden:** 20 sanal kullanıcı aynı anda sipariş oluşturuyordu. 7-8 masa dolunca yeni kullanıcılar müsait masa bulamıyor, iterasyonları yarıda kesiliyordu. Bu hem gerçekçi olmayan bir test hem de masa rekabetinden kaynaklanan yapay gecikmelere yol açıyordu.

**Çözüm:** Her iterasyon sonunda sipariş kapatıldı (`POST /api/order/close`). Masa tekrar müsait hale geliyor, bir sonraki kullanıcı onu kullanabiliyor.

**Sonuç:** p(95) 2.95s → 1.46s, threshold geçildi.

### Stress Test — Sistemin Doyma Noktası

**Bulgu:** Sistem ~90 kullanıcıda doyma noktasına ulaşıyor.

**Detay:**
- p(90) = 2.47s → ilk %90'lık dilim normal hızda yanıt veriyor
- p(95) = 37.25s → 90. kullanıcıdan sonra istekler kuyrukta beklemeye başlıyor
- Hata oranı = %0 → sistem çökmedi, yavaşladı ama cevap vermeye devam etti

**Yorum:** Graceful degradation — sistem aşırı yük altında hata fırlatmak yerine yavaşlayarak ayakta kaldı. 100 eş zamanlı kullanıcı bu projenin gerçekçi kullanım senaryosunun çok üzerinde olduğundan bu sonuç kabul edilebilir.
