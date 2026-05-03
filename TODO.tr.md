# 📋 Yapılacaklar Listesi
> **Son Güncelleme:** Mayıs 2026
> *Bu dosya, projenin devam eden geliştirme sürecini ve gelecekteki yol haritasını takip etmek amacıyla aktif olarak güncellenmektedir.*

## 🎨 Frontend (React)
- [x] **UI/UX:** Personel (Staff) sayfasındaki ekleme ve düzenleme Modal'larının ekrana sığmama (overflow) sorunları giderildi.
- [x] **UI:** Kullanıcı (User) ekleme ve düzenleme Modal'larına Email alanı dahil edildi.
- [x] **UI:** Silme işlemleri tetiklendiğinde kullanıcıdan onay (Confirmation Dialog) alınması sağlandı.
- [x] **Feature:** Kullanıcı Modal'ı açıldığında sistemin otomatik bir `UserCode` önermesi sağlandı (kullanıcı dilerse değiştirebilir).
- [ ] **Validation:** Frontend formlarına istemci taraflı (client-side) doğrulama eklenecek, hatalı verilerin backend'e gidip hata fırlatmasının önüne geçilecek.(bitenler => admin tarafındaki{ menu, categories, staff, tables, reports })
- [ ] **UI/UX:** İlk kayıt sonrası (Onboarding) restoran oluşturma ekranının tasarımı, mevcut global tasarım diline uyarlanacak.
- [ ] **UI:** API'den dönen hata mesajlarının (Error Handling) tüm sayfalarda düzgün gösterilmesi için global bir bildirim (Toast) mekanizması kurulacak.
- [ ] **profile kısmı:** profil kısmı eksik profil kısmı eklenecek
- [ ] **kasa kısmı:** kasaya ait hiç bir şey yok
- [ ] **reports kısmı:** reports içerisi doldurulacak
- [ ] **pospage:** sayfadaki ücret alma kaldırılacak ve kasiyer sayfası yapılacak
- [ ] **pospage:** ui telefona uygun değil response sayfa yapılacak.
- [ ] **pospage:** siparişler içindeki yeni sekmesindeki çöp ikonu çalışmıyor.
- [ ] **pospage:** masalara dön ikonu saçma bir yerde bakılacak.
 
## ⚙️ Backend (.NET Core)
- [x] **Feature [Category]:** Kategori silme endpoint'inde ilişkili ürün (Product) kontrolü yapıldı; bağlı ürün varsa silme işlemi engellendi.
- [x] **Feature [User]:** Kullanıcı (User) güncelleme (Update) metodu yazıldı.
- [x] **Refactor [Auth]:** Giriş (Login) işlemi yalnızca Username ile değil, Email ile de yapılabilecek şekilde CQRS Command ve Handler yapıları güncellendi.
- [ ] **Refactor [Auth]:** Kayıt (Register) aşamasında kullanıcıdan `UserCode` alma zorunluluğu kaldırılacak; bu kod backend tarafında otomatik oluşturulacak.
- [ ] **Validation:** Backend tarafındaki mevcut validasyon kuralları gözden geçirilecek ve eksik olan iş kuralları (business rules) tamamlanacak.
- [ ] **Refactor:** Dışarıdan alınan DTO'lar (Data Transfer Objects) ve nesne eşleme (Mapping) konfigürasyonları kontrol edilip optimize edilecek.
- [ ] **Refactor:** Table işlemleri içerisindeki genel `Update` metodunun ismi, standartlara uygun şekilde `UpdateTable` olarak değiştirilecek.
- [ ] **Refactor [Category]:** `DeleteCategoryCommandHandler` içerisindeki iş mantığı gözden geçirilip optimize edilecek.
- [ ] **Refactor:** admin tarafına önbellekleme yapılacak ürünler, categories, staff ve tables için