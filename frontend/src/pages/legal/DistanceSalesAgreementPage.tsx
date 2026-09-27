import { Link } from "react-router-dom";
import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

export default function DistanceSalesAgreementPage() {
    return (
        <LegalPageLayout title="Mesafeli Satış Sözleşmesi" updatedAt="27 Eylül 2026">
            <LegalSection heading="1. Taraflar">
                <p>
                    <strong>Hizmet Sağlayıcı:</strong> Fatih Kayacı<br />
                    E-posta: fatihkayaci@yahoo.com · Telefon: 0542 484 6147 · Adres: İstanbul / Sarıyer<br />
                    (aşağıda "Satıcı" olarak anılacaktır)
                </p>
                <p>
                    <strong>Alıcı:</strong> sophram.com üzerinden üye olan ve abonelik satın alan gerçek/tüzel kişi
                    (aşağıda "Alıcı" olarak anılacaktır).
                </p>
            </LegalSection>

            <LegalSection heading="2. Sözleşmenin Konusu">
                <p>
                    İşbu sözleşmenin konusu, Alıcı'nın Satıcı'ya ait sophram.com web sitesi üzerinden elektronik ortamda
                    sipariş verdiği "Sophram Restoran Yönetim Sistemi" dijital hizmetinin (bulut tabanlı yazılım aboneliği)
                    satışı ve ifasına ilişkin olarak, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
                    Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.
                </p>
            </LegalSection>

            <LegalSection heading="3. Hizmetin Temel Nitelikleri ve Fiyatı">
                <p>
                    Hizmetin türü, kapsamı ve güncel fiyatı (aylık/3 aylık/yıllık fatura periyotları) sophram.com/#pricing
                    sayfasında ve satın alma öncesinde Alıcı'ya açıkça gösterilir. Fiyatlara yürürlükteki mevzuat uyarınca
                    uygulanması gereken vergiler dahildir. Hizmet dijital ortamda sunulduğundan kargo/teslimat bedeli
                    bulunmamaktadır.
                </p>
            </LegalSection>

            <LegalSection heading="4. Ödeme">
                <p>
                    Ödemeler, Satıcı'nın anlaşmalı olduğu lisanslı ödeme kuruluşu (ör. PayTR) üzerinden kredi/banka kartı
                    ile alınır. Kart bilgileri Satıcı tarafından saklanmaz; işlem doğrudan ödeme kuruluşunun güvenli
                    altyapısı üzerinden gerçekleştirilir. Abonelik, Alıcı'nın seçtiği periyoda göre peşin olarak tahsil
                    edilir; otomatik yenileme Alıcı'nın kendi tercihiyle açtığı isteğe bağlı bir seçenektir.
                </p>
            </LegalSection>

            <LegalSection heading="5. Hizmetin İfası">
                <p>
                    Ödemenin onaylanmasının ardından Alıcı'nın hesabına erişimi anında (elektronik ortamda) sağlanır. 14
                    günlük ücretsiz deneme süresi boyunca ödeme alınmaz; deneme süresi hizmetin fiilen kullanılmaya
                    başlanması anlamına gelir.
                </p>
            </LegalSection>

            <LegalSection heading="6. Cayma Hakkı">
                <p>
                    Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, elektronik ortamda anında ifa edilen
                    hizmetler ve tüketicinin onayı ile cayma hakkı süresi dolmadan ifasına başlanan hizmetlerde cayma hakkı
                    istisnai olarak kullanılamayabilir. Bununla birlikte Satıcı, bu yasal istisnadan bağımsız olarak
                    Alıcı lehine kendi ticari politikası kapsamında{" "}
                    <Link to="/iptal-ve-iade" className="underline font-medium">
                        İptal ve İade Politikası
                    </Link>{" "}
                    sayfasında açıklanan şartlarla 14 gün içinde cayma ve kullanılmayan süre için iade imkânı
                    sunmaktadır. İade talepleri fatihkayaci@yahoo.com adresine yazılı olarak iletilir.
                </p>
            </LegalSection>

            <LegalSection heading="7. Uyuşmazlıkların Çözümü">
                <p>
                    İşbu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı'nca ilan edilen değere göre Alıcı'nın veya
                    Satıcı'nın yerleşim yerindeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.
                </p>
            </LegalSection>

            <LegalSection heading="8. Yürürlük">
                <p>
                    Alıcı, sophram.com üzerinden abonelik satın alma işlemini tamamladığında işbu sözleşmenin tüm
                    şartlarını okuduğunu ve kabul ettiğini beyan etmiş sayılır.
                </p>
            </LegalSection>
        </LegalPageLayout>
    );
}
