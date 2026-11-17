import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass, labelClass } from '@/lib/formStyles';
import { dataManagementService } from '@/features/dataManagement/api/dataManagementService';
import { HISTORY_GROUPS, type DataOverview, type DataSelection, type DeletionPreview } from '@/features/dataManagement/types';
import {
    BranchPicker, ConfirmStep, DoneStep, ExportButton, Notice, OptionList, PrimaryButton, PreviewList, SecondaryButton, StepLabel,
} from './DataFlowParts';

type Step = 'select' | 'preview' | 'confirm' | 'done';

// Seçerek sil: seç → sayıları gör → adı ve şifreyi yaz → sonuç.
export default function SelectiveDeleteFlow({ overview, onClose }: { overview: DataOverview; onClose: () => void }) {
    const singleBranch = overview.branches.length <= 1;
    const [step, setStep] = useState<Step>('select');
    const [branchIds, setBranchIds] = useState<string[]>(singleBranch ? overview.branches.map(b => b.id) : []);
    const [groups, setGroups] = useState<string[]>([]);
    const [olderOnly, setOlderOnly] = useState(false);
    const [olderThan, setOlderThan] = useState('');
    const [preview, setPreview] = useState<DeletionPreview | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasHistory = groups.some(g => HISTORY_GROUPS.includes(g));
    const selection: DataSelection = { branchIds, groups, olderThan: hasHistory && olderOnly && olderThan ? olderThan : null };
    const canContinue = groups.length > 0 && branchIds.length > 0 && (!hasHistory || !olderOnly || olderThan.length > 0);

    const loadPreview = async () => {
        setBusy(true);
        setError(null);
        try {
            setPreview(await dataManagementService.previewDelete(selection));
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
            setPreview(await dataManagementService.delete(selection, { restaurantName, password }));
            setStep('done');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Silinemedi.'));
        } finally {
            setBusy(false);
        }
    };

    const total = 3;

    if (step === 'select') {
        return (
            <div className="space-y-4">
                <StepLabel step={1} total={total} title="Ne silinsin?" />
                <BranchPicker branches={overview.branches} selected={branchIds} onChange={setBranchIds} />
                <div className="space-y-2">
                    {!singleBranch && <p className={labelClass}>Veriler</p>}
                    <OptionList options={overview.groups} selected={groups} onChange={setGroups} />
                </div>

                {hasHistory && (
                    <div className="space-y-2">
                        <p className={labelClass}>Geçmiş kayıtlar</p>
                        <div className="flex flex-wrap gap-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="radio" name="history-range" checked={!olderOnly} onChange={() => setOlderOnly(false)} className="accent-[var(--rb-gold)]" />
                                Hepsi
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="radio" name="history-range" checked={olderOnly} onChange={() => setOlderOnly(true)} className="accent-[var(--rb-gold)]" />
                                Şu tarihten eski olanlar
                            </label>
                        </div>
                        {olderOnly && (
                            <input type="date" className={`${inputClass} max-w-xs`} value={olderThan} onChange={e => setOlderThan(e.target.value)} aria-label="Bu tarihten eski kayıtlar" />
                        )}
                    </div>
                )}

                {error && <p role="alert" className="text-sm text-rb-red">{error}</p>}
                <div className="flex flex-wrap justify-between gap-2">
                    <SecondaryButton onClick={onClose}>Vazgeç</SecondaryButton>
                    <PrimaryButton onClick={loadPreview} disabled={!canContinue || busy}>{busy ? 'Hesaplanıyor...' : 'Devam'}</PrimaryButton>
                </div>
            </div>
        );
    }

    if (step === 'preview' && preview) {
        const blocked = preview.blockers.length > 0;
        return (
            <div className="space-y-4">
                <StepLabel step={2} total={total} title="Silinecekler" />
                <PreviewList branches={preview.branches} showBranchNames={!singleBranch} />

                {blocked && (
                    <Notice tone="block">
                        <p className="font-semibold">Şu an silinemez</p>
                        {preview.blockers.map(b => <p key={b}>{b}</p>)}
                    </Notice>
                )}

                {groups.includes('sales') && (
                    <Notice tone="warn">
                        <p>Satış ve ödeme kayıtlarını vergi mevzuatı gereği (genelde 5 yıl) saklamanız gerekebilir. Silmeden önce indirin.</p>
                    </Notice>
                )}
                {hasHistory && <ExportButton selection={selection} />}

                <div className="flex flex-wrap justify-between gap-2">
                    <SecondaryButton onClick={() => setStep('select')}>Geri</SecondaryButton>
                    <PrimaryButton onClick={() => { setError(null); setStep('confirm'); }} disabled={blocked || preview.totalCount === 0}>
                        {preview.totalCount === 0 ? 'Silinecek kayıt yok' : 'Devam'}
                    </PrimaryButton>
                </div>
            </div>
        );
    }

    if (step === 'confirm' && preview) {
        return (
            <div className="space-y-4">
                <StepLabel step={3} total={total} title="Onay" />
                <p className="text-sm text-muted-foreground">{preview.totalCount} kayıt kalıcı olarak silinecek. Bu geri alınamaz.</p>
                <ConfirmStep
                    companyName={overview.companyName}
                    actionLabel="Kalıcı olarak sil"
                    busy={busy}
                    error={error}
                    onBack={() => setStep('preview')}
                    onConfirm={confirm}
                />
            </div>
        );
    }

    return (
        <DoneStep title={`${preview?.totalCount ?? 0} kayıt silindi.`} onClose={onClose} />
    );
}
