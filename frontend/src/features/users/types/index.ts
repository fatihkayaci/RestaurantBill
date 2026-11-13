export interface User {
    id: string;
    fullName: string;
    userName: string;
    email?: string;
    phoneNumber: string;
    userCode: string;
    role: number;
    isActive: boolean;
    branchId: string;
    branchName?: string | null;
    // Birden çok şubeye atanmış admin için tüm şubeler; diğer personelde tek eleman.
    branchIds?: string[];
    restaurantName?: string | null;
    hireDate?: string | null;
    isPhoneVerified: boolean;
    isEmailVerified: boolean;
    /** Garson bölgeleri; boş = tüm bölgeler. */
    regionIds?: string[];
    /** Mutfak kullanıcısının menü kategorileri; boş = tüm kategoriler. */
    categoryIds?: string[];
    /** Garson yetkileri. Garson dışındaki rollerde hep true döner. */
    canTakeOrders?: boolean;
    canTakePayment?: boolean;
    canCancelAndDiscount?: boolean;
    canTransferAndReserve?: boolean;
}

/** Garson yetkileri ve bölgeler, mutfak kategorileri (Kullanıcılar formu). */
export interface StaffAssignment {
    regionIds?: string[];
    categoryIds?: string[];
    canTakeOrders?: boolean;
    canTakePayment?: boolean;
    canCancelAndDiscount?: boolean;
    canTransferAndReserve?: boolean;
}

export interface CreateUser extends StaffAssignment {
    fullName: string;
    userName: string;
    email?: string;
    phoneNumber: string;
    passwordHash: string;
    userCode?: string;
    role: number;
    branchId?: string;
    branchIds?: string[];
    hireDate?: string;
}

export interface UpdateUser extends StaffAssignment {
    id: string;
    fullName: string;
    userName: string;
    email?: string;
    phoneNumber: string;
    password?: string;
    userCode?: string;
    role: number;
    isActive?: boolean;
    branchId?: string;
    // Verilirse admin'in şube üyelikleri bu listeyle eşitlenir (sadece Owner).
    branchIds?: string[];
    hireDate?: string;
}

/** Garson ekranında hangi işlemlerin gösterileceği. Sunucu da aynı kuralları uygular. */
export interface WaiterPermissions {
    canTakeOrders: boolean;
    canTakePayment: boolean;
    canCancelAndDiscount: boolean;
    canTransferAndReserve: boolean;
}

export const ALL_WAITER_PERMISSIONS: WaiterPermissions = {
    canTakeOrders: true, canTakePayment: true, canCancelAndDiscount: true, canTransferAndReserve: true,
};

export function waiterPermissionsOf(user: User): WaiterPermissions {
    return {
        canTakeOrders: user.canTakeOrders ?? true,
        canTakePayment: user.canTakePayment ?? true,
        canCancelAndDiscount: user.canCancelAndDiscount ?? true,
        canTransferAndReserve: user.canTransferAndReserve ?? true,
    };
}
