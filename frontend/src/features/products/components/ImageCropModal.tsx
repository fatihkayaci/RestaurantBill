import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCroppedImageBlob } from '@/lib/cropImage';

interface ImageCropModalProps {
    imageSrc: string;
    aspect?: number;
    onCancel: () => void;
    onConfirm: (blob: Blob) => void | Promise<void>;
}

export default function ImageCropModal({ imageSrc, aspect = 16 / 9, onCancel, onConfirm }: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixelsValue: Area) => {
        setCroppedAreaPixels(croppedAreaPixelsValue);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;
        setIsSaving(true);
        setError(null);
        try {
            const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
            await onConfirm(blob);
        } catch {
            setError('Görsel kırpılamadı. Farklı bir görsel deneyin.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => !isSaving && onCancel()} />
            <div className="relative bg-white dark:bg-[#26221e] rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-border">
                    <h2 className="text-lg font-bold text-foreground">Görseli Kırp</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Sürükleyerek konumlandır, kaydırıcıyla yakınlaştır.</p>
                </div>

                <div className="relative w-full aspect-video bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                    />
                </div>

                <div className="px-6 py-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={e => setZoom(Number(e.target.value))}
                            className="w-full accent-rb-accent"
                        />
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>

                <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        İptal
                    </button>
                    <Button type="button" onClick={handleConfirm} disabled={isSaving || !croppedAreaPixels}>
                        {isSaving ? 'Kaydediliyor...' : 'Kırp ve Kaydet'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
