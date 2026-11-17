import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/apiError';
import { labelClass } from '@/lib/formStyles';
import { dataManagementService } from '@/features/dataManagement/api/dataManagementService';
import type { DataOverview, ResetPreview } from '@/features/dataManagement/types';
import { BranchPicker, ConfirmStep, DoneStep, OptionList, PrimaryButton, SecondaryButton, StepLabel } from './DataFlowParts';

type Step = 'select' | 'preview' | 'confirm' | 'done';

// Sıfırla: seçilen ayarlar yeni açılmış bir restoranınki gibi olur. Satış, menü, rezervasyon gibi kayıtlara dokunulmaz.
export default function ResetFlow({ overview, onClose }: { overview: DataOverview; onClose: () => void }) {
    const singleBranch = overview.branches.length <= 1;
    const [step, setStep] = useState<Step>('select');
    const [branchIds, setBranchIds] = useState<string[]>(singleBranch ? overview.branches.map(b => b.id) : []);
    const [items, setItems] = useState<string[]>([]);
    const [preview, setPreview] = useState<ResetPreview | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPreview = async () => {
        setBusy(true);
        setError(null);
        try {
            setPreview(await dataManagementService.previewReset(branchIds, items));
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
            await dataManagementService.reset(branchIds, items, { restaurantName, password });
            setStep('done');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Sıfırlanamadı.'));
        } finally {
            setBusy(false);
        }
    };

    if (step === 'select') {
        return (
            <div className="space-y-4">
                <StepLabel step={1} total={3} title="Neler ilk hâline dönsün?" />
                <BranchPicker branches={overview.branches} selected={branchIds} onChange={setBranchIds} />
                <div className="space-y-2">
                    {!singleBranch && <p className={labelClass}>Ayarlar</p>}
                    <OptionList options={overview.resetItems} selected={items} onChange={setItems} />
                </div>
                {error && <p role="alert" className="text-sm text-rb-red">{error}</p>}
                <div className="flex flex-wrap justify-between gap-2">
                    <SecondaryButton onClick={onClose}>Vazgeç</SecondaryButton>
                    <PrimaryButton onClick={loadPreview} disabled={items.length === 0 || branchIds.length === 0 || busy}>
                        {busy ? 'Hazırlanıyor...' : 'Devam'}
                    </PrimaryButton>
                </div>
            </div>
        );
    }

    if (step === 'preview' && preview) {
        return (
            <div className="space-y-4">
                <StepLabel step={2} total={3} title="Değişecekler" />
                <div className="space-y-3">
                    {preview.branches.map(b => (
                        <div key={b.branchId} className="rounded-xl border border-border">
                            {!singleBranch && <p className="border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">{b.branchName}</p>}
                            <ul className="divide-y divide-border">
                                {b.items.map(i => (
                                    <li key={i.key} className="px-4 py-3">
                                        <p className="text-sm text-foreground">{i.label}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{i.description}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">Satışlar, menü, masalar ve diğer kayıtlar olduğu gibi kalır. Giriş bilgileri, restoran adı ve site adresi değişmez.</p>
                <div className="flex flex-wrap justify-between gap-2">
                    <SecondaryButton onClick={() => setStep('select')}>Geri</SecondaryButton>
                    <PrimaryButton onClick={() => { setError(null); setStep('confirm'); }}>Devam</PrimaryButton>
                </div>
            </div>
        );
    }

    if (step === 'confirm') {
        return (
            <div className="space-y-4">
                <StepLabel step={3} total={3} title="Onay" />
                <ConfirmStep
                    companyName={overview.companyName}
                    actionLabel="Sıfırla"
                    busy={busy}
                    error={error}
                    onBack={() => setStep('preview')}
                    onConfirm={confirm}
                />
            </div>
        );
    }

    return <DoneStep title="Ayarlar ilk hâline döndü." onClose={onClose} />;
}
