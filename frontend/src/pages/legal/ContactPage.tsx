import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

export default function ContactPage() {
    return (
        <LegalPageLayout title="İletişim" updatedAt="27 Eylül 2026">
            <LegalSection heading="Sophram Hakkında">
                <p>
                    Sophram, restoranların garson, mutfak, kasiyer ve admin süreçlerini tek platformda, gerçek zamanlı
                    senkronizasyonla yönetmesini sağlayan bir restoran yönetim yazılımıdır. Sophram, Fatih Kayacı
                    tarafından geliştirilmekte ve işletilmektedir.
                </p>
            </LegalSection>

            <LegalSection heading="İletişim Bilgileri">
                <ul className="list-disc pl-5 flex flex-col gap-1">
                    <li>
                        E-posta:{" "}
                        <a href="mailto:fatihkayaci@yahoo.com" className="underline font-medium">
                            fatihkayaci@yahoo.com
                        </a>
                    </li>
                    <li>
                        Telefon:{" "}
                        <a href="tel:+905424846147" className="underline font-medium">
                            0542 484 6147
                        </a>
                    </li>
                    <li>Adres: İstanbul / Sarıyer</li>
                    <li>
                        Web sitesi:{" "}
                        <a href="https://sophram.com" className="underline font-medium">
                            sophram.com
                        </a>
                    </li>
                </ul>
            </LegalSection>

            <LegalSection heading="Destek">
                <p>
                    Teknik destek, faturalandırma veya iptal/iade talepleriniz için yukarıdaki e-posta adresinden bize
                    ulaşabilirsiniz. Talepler mesai saatleri içinde en geç 2 iş günü içinde yanıtlanır.
                </p>
            </LegalSection>
        </LegalPageLayout>
    );
}
