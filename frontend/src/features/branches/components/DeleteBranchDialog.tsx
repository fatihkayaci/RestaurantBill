import { useState } from 'react';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { branchService } from '@/features/branches/api/branchService';
import type { Branch } from '@/features/branches/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';

interface Props {
    branch: Branch | null;
    onClose: () => void;
    onDeleted: (branch: Branch) => void;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

// Şube silme onayı: yanlışlıkla silmeyi önlemek için şube adı yazdırılır. Engel varsa (personel, açık adisyon...)
// backend'in açıklaması pencerede gösterilir.
export default function DeleteBranchDialog({ branch, onClose, onDeleted }: Props) {
    const [typed, setTyped] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const close = () => {
        if (deleting) return;
        setTyped('');
        setError(null);
        onClose();
    };

    const matches = branch !== null && normalize(typed) === normalize(branch.branchName);

    const handleDelete = async () => {
        if (!branch || !matches) return;
        setDeleting(true);
        setError(null);
        try {
            await branchService.deleteBranch(branch.id);
            setTyped('');
            onDeleted(branch);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Şube silinemedi.'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AlertDialog open={branch !== null} onOpenChange={open => { if (!open) close(); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Şubeyi sil</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-semibold text-foreground">{branch?.branchName}</span> şubesi silinecek. Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Şube; şube listesinden, şube seçiciden ve müşteri sitesinden kalkar. Masa QR kodları ve online sipariş çalışmaz.</li>
                    <li>Şubenin menüsü, bölgeleri, masaları ve kasaları şubeyle birlikte kapanır.</li>
                    <li>Geçmiş adisyonlar, ödemeler, vardiyalar ve işlem kayıtları silinmez; raporlarda görünmeye devam eder.</li>
                    <li>Şubede personel, açık adisyon, açık vardiya, sürmekte olan paket sipariş ya da yaklaşan rezervasyon varsa önce bunları kapatmanız gerekir.</li>
                </ul>

                <div>
                    <label htmlFor="delete-branch-confirm" className={labelClass}>
                        Onaylamak için şube adını yazın: <span className="normal-case font-semibold text-foreground">{branch?.branchName}</span>
                    </label>
                    <input
                        id="delete-branch-confirm"
                        autoComplete="off"
                        className={cn(inputClass, error && 'border-destructive')}
                        value={typed}
                        onChange={e => { setTyped(e.target.value); setError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleDelete(); } }}
                    />
                </div>

                {error && (
                    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
                    <Button variant="destructive" disabled={!matches || deleting} onClick={handleDelete}>
                        {deleting ? 'Siliniyor...' : 'Şubeyi sil'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
