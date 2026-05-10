# 📋 Yapılacaklar Listesi
> **Son Güncelleme:** Mayıs 2026
> *Bu dosya, projenin devam eden geliştirme sürecini ve gelecekteki yol haritasını takip etmek amacıyla aktif olarak güncellenmektedir.*

## 🎨 Frontend (React)
- [x] **UI/UX:** Personel (Staff) sayfasındaki ekleme ve düzenleme Modal'larının ekrana sığmama (overflow) sorunları giderildi.
- [x] **UI:** Kullanıcı (User) ekleme ve düzenleme Modal'larına Email alanı dahil edildi.
- [x] **UI:** Silme işlemleri tetiklendiğinde kullanıcıdan onay (Confirmation Dialog) alınması sağlandı.
- [x] **Feature:** Kullanıcı Modal'ı açıldığında sistemin otomatik bir `UserCode` önermesi sağlandı (kullanıcı dilerse değiştirebilir).
- [x] **Kasiyer:** Kasiyer sayfasının tasarımı uygulandı.
- [ ] **Kasiyer:** sayfada signalR yok eklenecek
- [x] **Garson:** sayfada servis işlemi eklenecek
- [x] **Garson:** sayfada servis sekmesi eklenecek
- [ ] **Validation:** Frontend formlarına istemci taraflı (client-side) doğrulama eklenecek; hatalı verilerin backend'e gidip hata fırlatmasının önüne geçilecek. (Tamamlananlar => admin tarafındaki { menu, categories, staff, tables, reports })
- [ ] **UI/UX:** İlk kayıt sonrası (Onboarding) restoran oluşturma ekranının tasarımı, mevcut global tasarım diline uyarlanacak.
- [ ] **UI:** API'den dönen hata mesajlarının (Error Handling) tüm sayfalarda düzgün gösterilmesi için global bir bildirim (Toast) mekanizması kurulacak.
- [ ] **Profil:** Profil kısmı eksik; profil sayfası eklenecek.
- [ ] **Kasa:** Kasaya ait hiçbir şey yok; kasa modülü eklenecek.
- [ ] **Reports:** Reports sayfasının içeriği doldurulacak.
- [ ] **PosPage:** Sayfadaki ücret alma kısmı kaldırılacak ve kasiyer sayfası ile entegre edilecek.
- [ ] **PosPage:** UI telefona uygun değil; responsive sayfa yapılacak.
- [ ] **PosPage:** Siparişler içindeki "Yeni" sekmesindeki çöp ikonu çalışmıyor, düzeltilecek.
- [ ] **PosPage:** "Masalara dön" ikonu uygunsuz bir konumda, yeri gözden geçirilecek.
- [ ] **ürün:** order içerisindeki ürün bazlı status değişimi yapılacak.

## ⚙️ Backend (.NET Core)
- [x] **Feature [Category]:** Kategori silme endpoint'inde ilişkili ürün (Product) kontrolü yapıldı; bağlı ürün varsa silme işlemi engellendi.
- [x] **Feature [User]:** Kullanıcı (User) güncelleme (Update) metodu yazıldı.
- [x] **Refactor [Auth]:** Giriş (Login) işlemi yalnızca Username ile değil, Email ile de yapılabilecek şekilde CQRS Command ve Handler yapıları güncellendi.
- [ ] **Refactor [Auth]:** Kayıt (Register) aşamasında kullanıcıdan `UserCode` alma zorunluluğu kaldırılacak; bu kod backend tarafında otomatik oluşturulacak.
- [ ] **Validation:** Backend tarafındaki mevcut validasyon kuralları gözden geçirilecek ve eksik olan iş kuralları (business rules) tamamlanacak.
- [ ] **Refactor:** Dışarıdan alınan DTO'lar (Data Transfer Objects) ve nesne eşleme (Mapping) konfigürasyonları kontrol edilip optimize edilecek.
- [ ] **Refactor:** Table işlemleri içerisindeki genel `Update` metodunun ismi, standartlara uygun şekilde `UpdateTable` olarak değiştirilecek.
- [ ] **Refactor [Category]:** `DeleteCategoryCommandHandler` içerisindeki iş mantığı gözden geçirilip optimize edilecek.
- [ ] **Refactor:** Admin tarafına önbellekleme (cache) eklenecek: products, categories, staff ve tables için.
- [ ] **Create:** Kasiyer sayfası için backend tarafı yazılacak (şu an tasarımda mock data mevcut).
- [ ] **ürün:** ürün bazlı status değişimine backend de kontrol edilecek
- [ ] **kasiyer:** sayfada ödeme alma kısmı eklenecek.