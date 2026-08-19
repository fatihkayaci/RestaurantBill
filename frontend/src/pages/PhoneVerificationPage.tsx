import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authService } from "@/features/auth/api/authService";
import { VerificationCodeType } from "@/features/auth/types";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function PhoneVerificationPage() {
    const navigate = useNavigate();
    const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
    const hasSentInitialCode = useRef(false);

    const sendCode = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded: Record<string, string> = jwtDecode(token);
        const userId = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
        await authService.sendCode({ userId, verificationCodeType: VerificationCodeType.Phone });
    };

    useEffect(() => {
        if (hasSentInitialCode.current) return;
        hasSentInitialCode.current = true;

        sendCode()
            .then(() => setCooldown(RESEND_COOLDOWN_SECONDS))
            .catch((error) => {
                if (axios.isAxiosError(error)) {
                    toast.error(error.response?.data?.error ?? "Kod gönderilemedi.");
                } else {
                    console.log('Beklenmeyen hata:', error);
                }
            });
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleResend = async () => {
        if (cooldown > 0) return;
        try {
            setResendLoading(true);
            await sendCode();
            setCooldown(RESEND_COOLDOWN_SECONDS);
            toast.success("Kod tekrar gönderildi.");
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.error ?? "Kod gönderilemedi.");
            } else {
                console.log('Beklenmeyen hata:', error);
            }
        } finally {
            setResendLoading(false);
        }
    };

    const isComplete = code.every(digit => digit !== "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isComplete) {
            toast.error("Lütfen kodu eksiksiz giriniz.");
            return;
        }
        try {
            setVerifyLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return;

            const decoded: Record<string, string> = jwtDecode(token);
            const userId = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

            const response = await authService.verifyCode({ userId, Code: code.join(""), type: VerificationCodeType.Phone });
            localStorage.setItem("token", response.token);

            toast.success("Telefon numaranız doğrulandı.");

            navigate(response.needsSlugSetup ? "/setup-slug" : "/owner");
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.error ?? "Doğrulama başarısız.");
            } else {
                console.log('Beklenmeyen hata:', error);
            }
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, "").slice(-1);
        const next = [...code];
        next[index] = digit;
        setCode(next);

        if (digit && index < CODE_LENGTH - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
        if (!pasted) return;
        e.preventDefault();
        const next = Array(CODE_LENGTH).fill("");
        pasted.split("").forEach((digit, i) => { next[i] = digit; });
        setCode(next);
        inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8] dark:bg-[#18140f] p-6">
            <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-[0_24px_64px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)] p-7">
                <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-[#f2ede4]">
                    Telefon Numaranızı Doğrulayın
                </h1>
                <p className="text-[13px] mt-1.5" style={{ color: "#a39080" }}>
                    <span className="font-medium">0532 *** ** 32</span> numarasına gönderilen 6 haneli kodu girin.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mt-6 flex justify-between gap-2">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => { inputsRef.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleChange(index, e.target.value)}
                                onKeyDown={e => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className="w-11 h-13 text-center text-lg font-semibold rounded-xl border border-border bg-[rgb(245,240,232)] dark:bg-white/5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-rb-accent"
                            />
                        ))}
                    </div>

                    <Button
                        type="submit"
                        disabled={!isComplete || verifyLoading}
                        className="w-full h-11.5 rounded-xl bg-rb-accent hover:opacity-90 text-white font-bold text-sm mt-6"
                    >
                        {verifyLoading ? "Doğrulanıyor..." : "Doğrula →"}
                    </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-4">
                    Kod gelmedi mi?{" "}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendLoading || cooldown > 0}
                        className="text-rb-accent font-medium hover:underline disabled:opacity-60 disabled:no-underline"
                    >
                        {resendLoading ? "Gönderiliyor..." : cooldown > 0 ? `Tekrar Gönder (${cooldown}sn)` : "Tekrar Gönder"}
                    </button>
                </p>
            </div>
        </div>
    );
}
