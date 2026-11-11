import { jwtDecode } from "jwt-decode";

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const NAME_ID_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

export interface Session {
    userId: string | null;
    role: string | null;
    // Aktif kapsam: şube modunda Branch.Id, Owner "Tümü" modunda Company.Id (backend'deki RestaurantId claim'i).
    restaurantId: string | null;
    companyId: string | null;
    // Owner "Tümü" modunda: şirket geneli sayfalar görünür, şubeye ait ekranlar (menü, masa, kasa) saklanır.
    isCompanyScope: boolean;
}

export function getSession(token: string | null = localStorage.getItem("token")): Session | null {
    if (!token) return null;
    try {
        const decoded: Record<string, string> = jwtDecode(token);
        const role = decoded[ROLE_CLAIM] ?? null;
        const restaurantId = decoded["RestaurantId"] ?? null;
        const companyId = decoded["CompanyId"] ?? null;
        return {
            userId: decoded[NAME_ID_CLAIM] ?? null,
            role,
            restaurantId,
            companyId,
            isCompanyScope: role === "Owner" && !!restaurantId && restaurantId === companyId,
        };
    } catch {
        return null;
    }
}

export function getRoleFromToken(token: string): string | null {
    return getSession(token)?.role ?? null;
}

export function getRoleHomePath(role: string | null, companyScope = false): string {
    switch (role) {
        case "Owner": return companyScope ? "/owner" : "/admin";
        case "Admin": return "/admin";
        case "Kitchen": return "/kitchen";
        case "Cashier": return "/cashier";
        case "Waiter": return "/waiter";
        default: return "/login";
    }
}

export function getHomePathFromToken(token: string | null = localStorage.getItem("token")): string {
    const session = getSession(token);
    return getRoleHomePath(session?.role ?? null, session?.isCompanyScope ?? false);
}

export function startSession(token: string): void {
    localStorage.setItem("token", token);
}

export function endSession(): void {
    localStorage.removeItem("token");
}
