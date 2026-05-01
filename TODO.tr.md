# 📋 Yapılacaklar Listesi

## 🏷️ Kategori Yönetimi
- [ ] **UI:** Herhangi bir silme işlemi tetiklendiğinde kullanıcıdan onay (Confirmation Dialog) alınacak.
- [ ] **Backend:** Kategori silme endpoint'inde ilişkili ürün (Product) kontrolü yapılacak (Foreign Key validasyonu).
- [ ] **UI/UX:** Kategoriye bağlı ürün(ler) varsa silme işlemi engellenecek ve ekranda *"Bu kategoriye bağlı ürünler bulunmaktadır. Lütfen silmeden önce ilgili ürünlerin kategorisini güncelleyin."* uyarısı gösterilecek.

## 🎨 Frontend (React)
- [ ] **UI/UX:** Personel (Staff) sayfasındaki ekleme ve düzenleme pop-up'larının (modal) ekrana sığmama (overflow) sorunları giderilecek.
- [ ] **UI:** Hiçbir sayfada görünmeyen hata mesajları (Error Handling) için global bir hata gösterim mekanizması eklenecek.
- [ ] **UI:** Kullanıcı (User) ekleme ve düzenleme pop-up'larına Email alanı dahil edilecek.

## ⚙️ Backend (.NET)
- [ ] **Feature:** Kullanıcı kaydı sırasında otomatik bir `UserCode` üretilecek. Sistem bir kod önerecek ancak kullanıcı dilerse bunu değiştirebilecek.
- [ ] **Refactor:** Kullanıcı işlemleri için içeri alınan DTO'lar (Data Transfer Objects) gözden geçirilecek ve optimize edilecek.
- [x] **Feature:** Kullanıcı (User) güncelleme (Update) metodu yazılacak.

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