import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

export default function PrivacyPolicyPage() {
    return (
        <LegalPageLayout title="Gizlilik Politikası" updatedAt="27 Eylül 2026">
            <LegalSection heading="1. Veri Sorumlusu">
                <p>
                    Sophram ("Site", "Hizmet") <strong>Fatih Kayacı</strong> tarafından işletilmektedir. 6698 sayılı Kişisel
                    Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla hareket eden Fatih Kayacı'ya
                    aşağıdaki iletişim bilgilerinden ulaşabilirsiniz:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                    <li>E-posta: fatihkayaci@yahoo.com</li>
                    <li>Telefon: 0542 484 6147</li>
                    <li>Adres: İstanbul / Sarıyer</li>
                    <li>Web sitesi: https://sophram.com</li>
                </ul>
                <p>
                    Sophram şu an için tüzel bir şirket bünyesinde değil, şahıs faaliyeti olarak yürütülmektedir; ticari
                    unvan/vergi numarası bilgisi tüzel kişilik oluşturulduğunda bu sayfada güncellenecektir.
                </p>
            </LegalSection>

            <LegalSection heading="2. Toplanan Veriler">
                <p>Hizmeti kullanırken aşağıdaki kişisel veriler işlenebilir:</p>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                    <li>Hesap bilgileri: ad-soyad, e-posta adresi, telefon numarası, şifre (şifrelenmiş olarak saklanır)</li>
                    <li>İşletme bilgileri: restoran/şube adı, adres, çalışan bilgileri (rol bazlı kullanıcı hesapları)</li>
                    <li>Kullanım verileri: sipariş, ödeme, vardiya ve masa hareketleri gibi hizmet içi işlem kayıtları</li>
                    <li>Teknik veriler: IP adresi, tarayıcı bilgisi, oturum/çerez verileri</li>
                    <li>İletişim verileri: destek talepleri kapsamında paylaşılan bilgiler</li>
                </ul>
            </LegalSection>

            <LegalSection heading="3. Verilerin İşlenme Amacı">
                <p>Kişisel veriler; hesabınızın oluşturulması ve yönetimi, hizmetin sunulması ve sürdürülmesi,</p>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                    <li>Üyelik/abonelik süreçlerinin yürütülmesi ve faturalandırma</li>
                    <li>Ödeme işlemlerinin gerçekleştirilmesi (ödeme sağlayıcı aracılığıyla)</li>
                    <li>Müşteri desteği sağlanması ve talep/şikâyetlerin çözümü</li>
                    <li>Hizmetin güvenliğinin ve hukuka uygunluğunun sağlanması</li>
                    <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                </ul>
                <p>amaçlarıyla, KVKK'nın 5. ve 6. maddelerinde belirtilen hukuki sebeplere dayanılarak işlenmektedir.</p>
            </LegalSection>

            <LegalSection heading="4. Verilerin Paylaşılması">
                <p>
                    Kişisel verileriniz, hizmetin sunulabilmesi için zorunlu olduğu ölçüde aşağıdaki taraflarla
                    paylaşılabilir:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                    <li>Ödeme işlemlerinin gerçekleştirilmesi için lisanslı ödeme kuruluşları (ör. PayTR)</li>
                    <li>Altyapı ve barındırma hizmeti sağlayan sunucu/bulut sağlayıcıları</li>
                    <li>Yasal olarak talep edilmesi halinde yetkili kamu kurum ve kuruluşları</li>
                </ul>
                <p>Verileriniz hiçbir şekilde ticari amaçla üçüncü taraflara satılmaz veya kiralanmaz.</p>
            </LegalSection>

            <LegalSection heading="5. Çerezler">
                <p>
                    Site, oturum yönetimi ve tercihlerinizin (ör. açık/koyu tema) hatırlanması için zorunlu çerezler
                    kullanır. Bu çerezler hizmetin çalışması için gereklidir ve reklam/izleme amaçlı üçüncü taraf çerezleri
                    kullanılmamaktadır.
                </p>
            </LegalSection>

            <LegalSection heading="6. Veri Saklama Süresi">
                <p>
                    Kişisel veriler, işlenme amacının gerektirdiği süre ile sınırlı olarak veya ilgili mevzuatta öngörülen
                    zamanaşımı süreleri boyunca saklanır. Hesabınızı kapattığınızda, yasal saklama yükümlülüğü bulunmayan
                    veriler makul bir süre içinde silinir veya anonim hale getirilir.
                </p>
            </LegalSection>

            <LegalSection heading="7. KVKK Kapsamındaki Haklarınız">
                <p>KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                    <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                    <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                    <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                    <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                    <li>Eksik/yanlış işlenmişse düzeltilmesini isteme</li>
                    <li>Kanuni şartlar çerçevesinde silinmesini/yok edilmesini isteme</li>
                    <li>İşlemenin kanuna aykırı yapılması nedeniyle zarara uğranması halinde zararın giderilmesini talep etme</li>
                </ul>
                <p>
                    Bu haklarınızı kullanmak için fatihkayaci@yahoo.com adresine yazılı olarak başvurabilirsiniz. Talebiniz
                    en geç 30 gün içinde sonuçlandırılır.
                </p>
            </LegalSection>
        </LegalPageLayout>
    );
}
