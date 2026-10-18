import { isAxiosError } from 'axios';

// Backend iki şekilde hata döner: Result hataları { error }, middleware'den geçenler { message }.
export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (isAxiosError<{ error?: string; message?: string }>(err)) {
        return err.response?.data?.error ?? err.response?.data?.message ?? fallback;
    }
    return fallback;
}
