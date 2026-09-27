import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

export default function RefundPolicyPage() {
    return (
        <LegalPageLayout title="İptal ve İade Politikası" updatedAt="27 Eylül 2026">
            <LegalSection heading="1. Ücretsiz Deneme">
                <p>
                    Sophram'a kayıt olan her Kullanıcı, kredi kartı bilgisi vermeden 14 gün boyunca Hizmet'in tüm
                    özelliklerini ücretsiz olarak dener. Deneme süresi boyunca herhangi bir ücret tahsil edilmez.
                </p>
            </LegalSection>

            <LegalSection heading="2. 14 Günlük Cayma Hakkı">
                <p>
                    Ücretli bir abonelik satın alan Kullanıcı, ödeme tarihinden itibaren 14 gün içinde herhangi bir
                    gerekçe göstermeksizin abonelikten cayabilir. Cayma talebi fatihkayaci@yahoo.com adresine yazılı
                    olarak (e-posta yeterlidir) iletildiğinde, ödenen tutarın tamamı 14 iş günü içinde ödemenin yapıldığı
                    yöntemle iade edilir.
                </p>
            </LegalSection>

            <LegalSection heading="3. 14 Günden Sonraki İptaller — Kullanılmayan Süre İadesi">
                <p>
                    14 günlük süre geçtikten sonra abonelik iptal edildiğinde, ödenen tutarın kullanılmayan gün sayısına
                    karşılık gelen kısmı gün bazında hesaplanarak iade edilir. Örneğin yıllık plan satın alan bir Kullanıcı
                    6 ay sonra iptal ederse, kalan 6 aya karşılık gelen tutar iade edilir. İade talepleri de
                    fatihkayaci@yahoo.com adresine iletilir ve en geç 14 iş günü içinde sonuçlandırılır.
                </p>
            </LegalSection>

            <LegalSection heading="4. Otomatik Yenileme">
                <p>
                    Otomatik yenileme, varsayılan olarak kapalıdır ve yalnızca Kullanıcının kendi tercihiyle hesap
                    ayarlarından açması hâlinde devreye girer. Otomatik yenileme açıkken bir sonraki fatura döneminden
                    önce iptal edilen abonelikler için, o döneme ait yeni bir ücret tahsil edilmez. Otomatik yenileme her
                    zaman Kullanıcı tarafından kapatılabilir.
                </p>
            </LegalSection>

            <LegalSection heading="5. İade Yöntemi">
                <p>
                    Tüm iadeler, ödemenin yapıldığı kredi/banka kartına, ödeme kuruluşu (ör. PayTR) aracılığıyla yapılır.
                    Banka süreçlerine bağlı olarak iadenin hesaba yansıması birkaç iş günü sürebilir.
                </p>
            </LegalSection>

            <LegalSection heading="6. İletişim">
                <p>
                    İptal ve iade talepleriniz için: fatihkayaci@yahoo.com · 0542 484 6147. Talebinizde hesabınıza kayıtlı
                    e-posta adresini ve abonelik başlangıç tarihini belirtmeniz süreci hızlandırır.
                </p>
            </LegalSection>
        </LegalPageLayout>
    );
}
