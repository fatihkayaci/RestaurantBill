import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/lib/apiError';
import { dataManagementService } from '@/features/dataManagement/api/dataManagementService';
import { HISTORY_GROUPS, type ClosurePreview, type DataOverview } from '@/features/dataManagement/types';
import { formatDay } from '@/features/dataManagement/formatDay';
import { ConfirmStep, ExportButton, Notice, PrimaryButton, PreviewList, SecondaryButton, StepLabel } from './DataFlowParts';

type Step = 'intro' | 'preview' | 'confirm';

// Hesabı kapat: her zaman şirketin tamamı. Önce indirme önerilir; kapanınca sahip yalnızca "Vazgeç" ekranını görür.
export default function CloseAccountFlow({ overview, onClose }: { overview: DataOverview; onClose: () => void }) {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('intro');
    const [preview, setPreview] = useState<ClosurePreview | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const allHistory = { branchIds: overview.branches.map(b => b.id), groups: HISTORY_GROUPS, olderThan: null };

    const loadPreview = async () => {
        setBusy(true);
        setError(null);
        try {
            setPreview(await dataManagementService.previewClosure());
            setStep('preview');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Önizleme alınamadı.'));
        } finally {
            setBusy(false);
        }
    };

    const confirm = async (restaurantName: string, password: string) => {
        setBusy(true);
        setError(null);
        try {
            await dataManagementService.close({ restaurantName, password });
            navigate('/hesap-kapaniyor', { replace: true });
        } catch (err) {
            setError(getApiErrorMessage(err, 'Hesap kapatılamadı.'));
            setBusy(false);
        }
    };

    if (step === 'intro') {
        return (
            <div className="space-y-4">
                <StepLabel step={1} total={3} title="Önce indirin" />
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                    <li>Restoran hemen durur: çalışanlar giremez, site, QR menü ve sipariş sayfaları kapanır.</li>
                    <li>{overview.closureGraceDays} gün içinde giriş yapıp vazgeçebilirsiniz.</li>
                    <li>Sonra tüm şubeler, veriler ve fotoğraflar kalıcı olarak silinir.</li>
                </ul>
                <Notice tone="warn">
                    <p>Satış ve ödeme kayıtlarını vergi mevzuatı gereği (genelde 5 yıl) saklamanız gerekebilir. Silmeden önce indirin.</p>
                </Notice>
                <ExportButton selection={allHistory} label="Tüm geçmişi CSV olarak indir" />
                {error && <p role="alert" className="text-sm text-rb-red">{error}</p>}
                <div className="flex flex-wrap justify-between gap-2">
                    <SecondaryButton onClick={onClose}>Vazgeç</SecondaryButton>
                    <PrimaryButton onClick={loadPreview} disabled={busy}>{busy ? 'Hesaplanıyor...' : 'Devam'}</PrimaryButton>
                </div>
            </div>
        );
    }

    if (step === 'preview' && preview) {
        const staff = preview.staffCount > 0 ? `, ${preview.staffCount} çalışan hesabıyla birlikte` : '';
        return (
            <div className="space-y-4">
                <StepLabel step={2} total={3} title="Silinecekler" />
                <p className="text-sm text-foreground">{formatDay(preview.deletionDate)} tarihinde şunlar kalıcı olarak silinir{staff}:</p>
                <PreviewList branches={preview.branches} showBranchNames />
                <Notice>
                    <p>Sunucu yedeklerinde veriler bir süre daha kalır; yedeklerden de belirli bir süre sonra silinir.</p>
                </Notice>
                <div className="flex flex-wrap justify-between gap-2">
                    <SecondaryButton onClick={() => setStep('intro')}>Geri</SecondaryButton>
                    <PrimaryButton onClick={() => { setError(null); setStep('confirm'); }}>Devam</PrimaryButton>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <StepLabel step={3} total={3} title="Onay" />
            <ConfirmStep
                companyName={overview.companyName}
                actionLabel="Hesabı kapat"
                busy={busy}
                error={error}
                onBack={() => setStep('preview')}
                onConfirm={confirm}
            />
        </div>
    );
}
