# 📋 Yapılacaklar (TODO)

## 🏷️ Kategori Yönetimi (Category Management)
- [ ] **UI:** Herhangi bir silme işlemi tetiklendiğinde ekranda kullanıcıdan onay (Confirmation Dialog) alınacak.
- [ ] **Backend:** Kategori silme endpoint'inde ilişkili ürün (product) kontrolü yapılacak (Foreign Key validasyonu).
- [ ] **UI/UX:** Kategoriye bağlı ürün(ler) varsa silme işlemi engellenecek ve ekranda "Bu kategoriye bağlı ürünler bulunmaktadır. Lütfen silmeden önce ilgili ürünlerin kategorisini güncelleyin." uyarısı gösterilecek.

### 🎨 Frontend (React)
- [ ] **UI:** staff içerisindeki popup düzeltilecek sayfaya tam sığmama gibi bir şansı var hem edit için olan hem ekleme için olan popupdan bahsediliyor.
- [ ] **UI:** hiç bir sayfada errorlar gözükmüyor errorları gösterelim.
- [ ] **UI:** email kısmı eklenecek user popuplarına
### Backend (.net)
- [ ] **kayıt:** user kaydedilirken otomatik usercode oluşturma yapılacak. kullanıcı belirlemeye devam edebilecek sadece biz önerimizi yapacağız.
- [ ] **user:** alınan dtolara bakılacak
- [x] **user:** update method eksik.

<!-- 
## 🏃‍♂️ Aktif Sprint (Üzerinde Çalışılanlar)
- [ ] **Backend:** Sipariş modülü için RabbitMQ event'lerinin implementasyonu
- [ ] **Frontend:** React tarafında sepet UI optimizasyonları

## 📋 Bekleyenler (Backlog)
### ⚙️ Backend (.NET Core / Web API)
- [ ] CQRS pattern ile raporlama endpoint'lerinin ayrılması
- [ ] Rate limiting ve caching (Redis) entegrasyonu
- [ ] Unit test coverage'ın %80 üzerine çıkarılması

### 🎨 Frontend (React)
- [ ] Ant Design ile karanlık mod (dark mode) entegrasyonu
- [ ] Component'lerin lazy loading ile optimize edilmesi

### 🚀 DevOps & Altyapı
- [ ] Docker Compose konfigürasyonuna metrik/loglama servislerinin (Prometheus/Grafana) eklenmesi
- [ ] Nginx load balancer ayarlarının test edilmesi

## ✅ Tamamlananlar (Geçmiş)
- [x] Veritabanı modellemesi ve Entity Framework Core entegrasyonu (25.03.2026)
- [x] JWT tabanlı kimlik doğrulama
- [x] İlk sürümün Linux VPS üzerine deploy edilmesi -->