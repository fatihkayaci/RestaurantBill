import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

export default function TermsOfServicePage() {
    return (
        <LegalPageLayout title="Kullanım Koşulları" updatedAt="27 Eylül 2026">
            <LegalSection heading="1. Taraflar ve Kabul">
                <p>
                    Bu Kullanım Koşulları, https://sophram.com adresinde sunulan "Sophram" restoran yönetim hizmetini
                    ("Hizmet") işleten Fatih Kayacı ("Hizmet Sağlayıcı") ile Hizmet'e üye olan gerçek/tüzel kişi
                    ("Kullanıcı") arasındaki ilişkiyi düzenler. Hizmet'e kayıt olarak veya kullanarak bu koşulları kabul
                    etmiş sayılırsınız.
                </p>
            </LegalSection>

            <LegalSection heading="2. Hizmetin Tanımı">
                <p>
                    Sophram; restoran işletmelerinin masa, sipariş, mutfak, kasa ve raporlama süreçlerini tek bir platform
                    üzerinden, gerçek zamanlı senkronizasyon ile yönetmesini sağlayan bir SaaS (Hizmet Olarak Yazılım)
                    ürünüdür. Hizmet, ücretsiz deneme süresi ve ücretli abonelik planları ile sunulur.
                </p>
            </LegalSection>

            <LegalSection heading="3. Hesap Oluşturma ve Sorumluluk">
                <ul className="list-disc pl-5 flex flex-col gap-1">
                    <li>Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olduğunu kabul edersiniz.</li>
                    <li>Hesap bilgilerinizin (kullanıcı adı, şifre) gizliliğinden ve hesabınız üzerinden gerçekleşen tüm
                        işlemlerden siz sorumlusunuz.</li>
                    <li>Şüpheli/yetkisiz bir erişim fark ettiğinizde derhal fatihkayaci@yahoo.com adresinden bize
                        bildirmelisiniz.</li>
                    <li>İşletme sahibi (Owner/Admin) hesapları, kendi bünyesinde oluşturduğu personel (garson, kasiyer,
                        mutfak) hesaplarının kullanımından sorumludur.</li>
                </ul>
            </LegalSection>

            <LegalSection heading="4. Ücretlendirme ve Ödeme">
                <p>
                    Hizmet, 14 günlük ücretsiz deneme süresi sunar; deneme süresince kredi kartı bilgisi istenmez. Deneme
                    süresi sonunda Hizmet'i kullanmaya devam etmek isteyen Kullanıcı, seçtiği fatura periyoduna (aylık, 3
                    aylık veya yıllık) göre ödeme yapar. Otomatik yenileme, Kullanıcının kendi tercihine bağlı olarak
                    açılıp kapatılabilen isteğe bağlı bir özelliktir; Hizmet Sağlayıcı, Kullanıcının açık onayı olmadan
                    otomatik tahsilat yapmaz. Fiyatlandırma, güncel hâliyle sophram.com/#pricing sayfasında yayınlanır ve
                    önceden haber verilerek güncellenebilir.
                </p>
            </LegalSection>

            <LegalSection heading="5. Yasaklı Kullanımlar">
                <p>Kullanıcı, Hizmet'i aşağıdaki amaçlarla kullanamaz:</p>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                    <li>Yürürlükteki mevzuata aykırı faaliyetlerde bulunmak</li>
                    <li>Hizmet'in altyapısına zarar verecek, aşırı yük bindirecek veya güvenliğini tehlikeye atacak
                        girişimlerde bulunmak</li>
                    <li>Başkalarının kişisel verilerini izinsiz işlemek veya paylaşmak</li>
                    <li>Hizmet'i tersine mühendislik yapmak veya kaynak koduna izinsiz erişmeye çalışmak</li>
                </ul>
            </LegalSection>

            <LegalSection heading="6. Fikri Mülkiyet">
                <p>
                    Sophram'ın yazılımı, tasarımı, logosu ve marka unsurları Fatih Kayacı'ya aittir. Hizmet'e abone olmak,
                    yazılım üzerinde herhangi bir mülkiyet hakkı doğurmaz; yalnızca kullanım süresi boyunca hizmete erişim
                    hakkı tanır.
                </p>
            </LegalSection>

            <LegalSection heading="7. Sorumluluğun Sınırlandırılması">
                <p>
                    Hizmet Sağlayıcı, makul özeni göstermekle birlikte Hizmet'in kesintisiz ve hatasız çalışacağını garanti
                    etmez. Hizmet Sağlayıcı; internet kesintisi, üçüncü taraf altyapı sorunları veya mücbir sebeplerden
                    kaynaklanan kesintiler nedeniyle oluşabilecek dolaylı zararlardan sorumlu tutulamaz. Hizmet Sağlayıcı'nın
                    sorumluluğu, her hâlükârda Kullanıcının o dönem için ödediği abonelik bedeli ile sınırlıdır.
                </p>
            </LegalSection>

            <LegalSection heading="8. Fesih">
                <p>
                    Kullanıcı, hesabını dilediği zaman kapatarak Hizmet'i sonlandırabilir. Hizmet Sağlayıcı, bu Kullanım
                    Koşulları'nın ihlal edilmesi hâlinde Kullanıcının hesabını askıya alma veya sonlandırma hakkını saklı
                    tutar.
                </p>
            </LegalSection>

            <LegalSection heading="9. Değişiklikler ve İletişim">
                <p>
                    Bu Kullanım Koşulları güncellenebilir; önemli değişiklikler kayıtlı e-posta adresinize veya site
                    üzerinden bildirilir. Sorularınız için: fatihkayaci@yahoo.com · 0542 484 6147 · İstanbul/Sarıyer.
                </p>
            </LegalSection>
        </LegalPageLayout>
    );
}
