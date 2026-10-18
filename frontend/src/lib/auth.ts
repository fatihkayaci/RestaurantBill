import { jwtDecode } from "jwt-decode";
import { clearStoredCashRegisterId } from "@/features/cashier/context/activeShiftStore";

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export function getRoleFromToken(token: string): string | null {
    try {
        const decoded: Record<string, string> = jwtDecode(token);
        return decoded[ROLE_CLAIM] ?? null;
    } catch {
        return null;
    }
}

export function getRoleHomePath(role: string | null): string {
    switch (role) {
        case "Owner": return "/owner";
        case "Admin": return "/admin";
        case "Kitchen": return "/kitchen";
        case "Cashier": return "/cashier";
        case "Waiter": return "/waiter";
        default: return "/login";
    }
}

// Yeni bir oturum başlarken önceki kullanıcıdan kalan cihaz durumu (ör. seçili kasa) taşınmasın.
export function startSession(token: string): void {
    clearStoredCashRegisterId();
    localStorage.setItem("token", token);
}

export function endSession(): void {
    clearStoredCashRegisterId();
    localStorage.removeItem("token");
}
