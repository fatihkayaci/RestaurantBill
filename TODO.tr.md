# 📋 Yapılacaklar Listesi
> **Son Güncelleme:** Mayıs 2026
> *Bu dosya, projenin devam eden geliştirme sürecini ve gelecekteki yol haritasını takip etmek amacıyla aktif olarak güncellenmektedir.*

## 🎨 Frontend (React)
- [x] **UI/UX:** Personel sayfasındaki ekleme ve düzenleme modallarının ekrana sığmama (overflow) sorunları giderildi.
- [x] **UI:** Kullanıcı ekleme ve düzenleme modallarına e-posta alanı dahil edildi.
- [x] **UI:** Silme işlemleri tetiklendiğinde kullanıcıdan onay alınması sağlandı.
- [x] **Özellik:** Kullanıcı modalı açıldığında sistemin otomatik bir `UserCode` önermesi sağlandı (kullanıcı dilerse değiştirebilir).
- [x] **Kasiyer:** Kasiyer sayfasının tasarımı uygulandı.
- [x] **Garson:** Sayfaya servis işlemi eklendi.
- [x] **Garson:** Sayfaya servis sekmesi eklendi.
- [x] **Kasiyer:** Sahte veriler kaldırılıp gerçek API verileri bağlandı.
- [x] **Kasiyer:** Ödeme yöntemi olarak mevcut kasalardan seçim yapılabilmesi sağlandı.
- [x] **Kasiyer:** Son işlemler gerçek veriden çekiliyor.
- [ ] **Kasiyer:** Sayfaya SignalR eklenecek.
- [ ] **Kasiyer:** Sayfaya detaylı işlemleri görebileceği bir bölüm eklenecek.
- [ ] **Kasiyer:** Sayfadaki istatistik kartları düzeltilecek.
- [ ] **PosPage:** Sayfadaki "Onayla" gibi butonlar düzeltilecek.
- [ ] **Doğrulama:** Frontend formlarına istemci taraflı doğrulama eklenecek; hatalı verilerin backend'e gidip hata fırlatmasının önüne geçilecek. (Tamamlananlar: admin tarafındaki { menü, kategoriler, personel, masalar, raporlar })
- [ ] **UI/UX:** İlk kayıt sonrası restoran oluşturma ekranının tasarımı, mevcut global tasarım diline uyarlanacak.
- [ ] **UI:** API'den dönen hata mesajlarının tüm sayfalarda düzgün gösterilmesi için global bir bildirim (Toast) mekanizması kurulacak.
- [ ] **Profil:** Profil sayfası eksik; eklenecek.
- [ ] **Raporlar:** Raporlar sayfasının içeriği doldurulacak.
- [ ] **PosPage:** Sayfadaki ücret alma kısmı kaldırılacak ve kasiyer sayfasıyla entegre edilecek.
- [ ] **PosPage:** UI telefona uygun değil; responsive yapılacak.
- [ ] **PosPage:** Siparişler içindeki "Yeni" sekmesindeki çöp ikonu çalışmıyor, düzeltilecek.
- [ ] **PosPage:** "Masalara dön" ikonu uygunsuz bir konumda, yeri gözden geçirilecek.
- [ ] **Ürün:** Sipariş içerisindeki ürün bazlı durum değişimi yapılacak.
- [ ] **KDV:** Ayarlaması yapılabilecek bir alan eklenecek.
- [ ] **Status:** status olan yerlerde 2 tane olduğu için on off şeklinde slider'lı yapılacak.
- [ ] **Dosyalama:** şu an frontend tarafında adminpage tek satır diğer kitchen filan fazla sayfa onlara bi bakarız.
 
## ⚙️ Backend (.NET Core)
- [x] **Özellik [Kategori]:** Kategori silme endpoint'inde ilişkili ürün kontrolü yapıldı bağlı ürün varsa silme işlemi engellendi.
- [x] **Özellik [Kullanıcı]:** Kullanıcı güncelleme metodu yazıldı.
- [x] **Refactor [Auth]:** Giriş işlemi yalnızca kullanıcı adıyla değil, e-posta ile de yapılabilecek şekilde CQRS yapıları güncellendi.
- [x] **Özellik [Kasiyer]:** Kasiyer sayfası için backend yazıldı; ödeme alma ve transaction listeleme endpoint'leri eklendi.
- [x] **Refactor [Doğrulama]:** `AddFluentValidationAutoValidation` kaldırıldı; doğrulama yalnızca MediatR pipeline üzerinden çalışıyor.
- [x] **Refactor:** şu an güncellemelerde, eklemelerde, silmelerde hepsinde restaurantId kontrolü yapılsın başka bir restauranttakilere etki etmesin
- [x] **Refactor:** kayıt olurken restaurantId atanacak sonra bir daha problem çıkmayacak şu an restaurant tanımlandıktan sonra restaurantId geldiği için problemli çalışıyor
- [x] **Refactor [Auth]:** Kayıt aşamasında kullanıcıdan `UserCode` alma zorunluluğu kaldırılacak; bu kod backend tarafında otomatik oluşturulacak.
- [ ] **Refactor:** application katmanı feautre içerisindeki isimlendirmeler değişecek
- [ ] **Doğrulama:** Backend tarafındaki mevcut doğrulama kuralları gözden geçirilecek ve eksik iş kuralları tamamlanacak.
- [ ] **Refactor:** Gelen DTO'lar ve nesne eşleme konfigürasyonları kontrol edilip optimize edilecek.
- [ ] **Refactor [Kategori]:** `DeleteCategoryCommandHandler` içerisindeki iş mantığı gözden geçirilip optimize edilecek.
- [ ] **Refactor:** Admin tarafına önbellekleme eklenecek: ürünler, kategoriler, personel ve masalar için.
- [ ] **Kasiyer:** Transaction için bahşiş kısmı ayrı bir alan olarak ele alınacak.
- [ ] **Ürün:** Ürün bazlı durum değişimi backend tarafında da kontrol edilecek.
- [ ] **Refactor:** cachlemeye bakılacak.