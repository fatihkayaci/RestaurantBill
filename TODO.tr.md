# 📋 Proje Yol Haritası (Yapılacaklar)

> **Son güncelleme:** Haziran 2026
> Bu dosya, RestaurantBill'in tamamlanan işlerini ve kalan yol haritasını takip eder. İngilizce versiyon için: [TODO.md](TODO.md).

---

## 🎨 Frontend (React)

### ✅ Tamamlananlar
- [x] **UI/UX:** Personel ekleme & düzenleme modallarındaki ekrana sığmama (overflow) sorunu giderildi.
- [x] **UI:** Kullanıcı ekleme & düzenleme modallarına e-posta alanı eklendi.
- [x] **UI:** Silme işlemlerinden önce onay diyaloğu gösterilmesi sağlandı.
- [x] **UI:** API hata mesajlarını tüm sayfalarda göstermek için global Toast bildirim mekanizması kuruldu.
- [x] **Özellik:** Kullanıcı modalı açıldığında otomatik `UserCode` önerisi gelir (kullanıcı değiştirebilir).
- [x] **Personel:** Personel oluştururken rastgele varsayılan şifre üretiliyor (değiştirilebilir).
- [x] **Onboarding:** Restoran oluşturma ekranı global tasarım diline uyarlandı.
- [x] **Kasiyer:** Sayfa tasarımı uygulandı.
- [x] **Kasiyer:** Sahte veriler kaldırılıp gerçek API verisi bağlandı.
- [x] **Kasiyer:** Ödeme hedefi olarak mevcut kasalardan seçim yapılabiliyor.
- [x] **Kasiyer:** Son işlemler listesi gerçek veriye bağlandı.
- [x] **Kasiyer:** SignalR ile gerçek zamanlı güncelleme eklendi.
- [x] **Garson:** POS sayfasına servis işlemi ve "Servis edildi" sekmesi eklendi.
- [x] **Sipariş:** Sipariş içinde ürün bazlı durum değişimi eklendi.

### 🚧 Planlananlar
- [ ] **Doğrulama:** Hatalı verinin backend'e ulaşmasını engellemek için istemci taraflı form doğrulaması eklenecek. *(Tamamlananlar: admin tarafı — menü, kategoriler, personel, masalar, raporlar.)*
- [ ] **Kasiyer:** Detaylı işlemleri görebileceği bir bölüm eklenecek.
- [ ] **Kasiyer:** İstatistik kartları düzeltilecek.
- [ ] **Raporlar:** Raporlar sayfasının içeriği doldurulacak.
- [ ] **Profil:** Profil sayfası eklenecek.
- [ ] **POS:** Aksiyon butonları (ör. "Onayla") düzeltilecek.
- [ ] **POS:** Ücret alma kısmı kaldırılıp Kasiyer sayfasıyla entegre edilecek.
- [ ] **POS:** Sayfa tamamen mobil uyumlu yapılacak.
- [ ] **POS:** "Yeni" sekmesindeki çalışmayan çöp ikonu düzeltilecek.
- [ ] **POS:** Konumu uygunsuz olan "Masalara dön" ikonu yeniden yerleştirilecek.
- [ ] **UI:** İki durumlu status seçimleri aç/kapa slider'a dönüştürülecek.
- [ ] **KDV:** Ayarlanabilir bir KDV oranı alanı eklenecek.
- [ ] **Yapı:** Sayfa/klasör organizasyonu gözden geçirilecek (ör. tek dosya AdminPage'e karşı çok dosyalı Kitchen).

---

## ⚙️ Backend (.NET)

### ✅ Tamamlananlar
- [x] **Kategori:** İlişkili ürünü olan kategorilerin silinmesi engellendi (FK doğrulaması).
- [x] **Kullanıcı:** Eksik olan kullanıcı güncelleme metodu yazıldı.
- [x] **Kullanıcı:** `UserCode` kayıt sırasında istenmek yerine backend'de otomatik üretiliyor.
- [x] **Auth:** Giriş artık kullanıcı adı veya e-posta ile yapılabiliyor.
- [x] **Auth:** Sonradan oluşan kapsam sorunlarını önlemek için `restaurantId` kayıt anında atanıyor.
- [x] **Kasiyer:** Backend yazıldı — ödeme alma ve transaction listeleme endpoint'leri eklendi.
- [x] **Çok kiracılılık:** Tüm ekleme/güncelleme/silme işlemleri `restaurantId` ile kapsamlandı; kiracılar birbirinden izole.
- [x] **Önbellekleme:** Admin tarafı için ürünler, kategoriler, personel ve masalara önbellekleme eklendi.
- [x] **Personel:** Admin, personel listesinde kendini görmüyor.
- [x] **Doğrulama:** `AddFluentValidationAutoValidation` kaldırıldı; doğrulama yalnızca MediatR pipeline üzerinden çalışıyor.
- [x] **Refactor:** Application feature klasörlerindeki isimlendirmeler düzenlendi.

### 🚧 Planlananlar
- [ ] **Doğrulama:** Backend doğrulama kuralları gözden geçirilecek; eksik iş kuralları tamamlanacak.
- [ ] **Refactor:** Anemic modelden daha zengin (rich) domain modeline geçilecek.
- [ ] **Refactor:** Daha fazla domain exception tipi eklenip kapsam genişletilecek.
- [ ] **Refactor:** Gelen DTO'lar ve AutoMapper konfigürasyonları gözden geçirilip optimize edilecek.
- [ ] **Refactor:** Yalnızca isim gereken durumlar için hafif bir `RestaurantDto` oluşturulacak (şu an sadece header'a yazmak için tüm bilgiler gönderiliyor).
- [ ] **Refactor:** Masa işlemlerindeki generic `Update` metodu, isim tutarlılığı için `UpdateTable` olarak yeniden adlandırılacak.
- [ ] **Refactor [Kategori]:** `DeleteCategoryCommandHandler` içindeki iş mantığı gözden geçirilip optimize edilecek.
- [ ] **Refactor [Query]:** `restaurantId` JWT middleware ile garanti altına alınıp query handler'lardaki `restaurantId <= 0` kontrolleri kaldırılacak.
- [ ] **Önbellekleme:** Genel önbellekleme stratejisi gözden geçirilecek.
- [ ] **Kasiyer:** Bahşiş, transaction üzerinde ayrı bir alan olarak modellenecek.
- [ ] **Sipariş:** Ürün bazlı durum değişimi backend tarafında da doğrulanacak.
- [ ] **Auth:** Admin, giriş yapmış bir kullanıcının rolünü değiştirdiğinde o kullanıcı uyarılıp login sayfasına yönlendirilecek.
