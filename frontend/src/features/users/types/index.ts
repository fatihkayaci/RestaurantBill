/** Backend UserRole değerleri; personel sayfası ve rol etiketleri bu sayıları kullanır. Kurye = 6. */
export const USER_ROLES = { Admin: 1, Waiter: 2, Cashier: 3, Kitchen: 4, Owner: 5, Courier: 6 } as const;

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
    /** Masa masa bakılan bölgeler ("Seçili masalar"); diğer bölgelerin tamamına bakılır. */
    restrictedRegionIds?: string[];
    /** Masa masa bakılan bölgelerde seçili masalar. */
    tableIds?: string[];
    /** Mutfak kullanıcısının menü kategorileri; boş = tüm kategoriler. */
    categoryIds?: string[];
    /** Garson yetkileri. Garson dışındaki rollerde hep true döner. */
    canTakeOrders?: boolean;
    canTakePayment?: boolean;
    canCancelAndDiscount?: boolean;
    canTransferAndReserve?: boolean;
    /** Kasiyer yetkileri ve indirim sınırı (100 = sınırsız). Kasiyer dışındaki rollerde hep true / 100 döner. */
    canApplyDiscount?: boolean;
    maxDiscountPercent?: number;
    canTransferTables?: boolean;
    /** Kasiyer paket siparişleri görür mü; garson hiç görmez, diğer roller hep görür. */
    canViewDelivery?: boolean;
}

/** Garson ve kasiyer yetkileri, bölgeler, mutfak kategorileri (Kullanıcılar formu). */
export interface StaffAssignment {
    regionIds?: string[];
    restrictedRegionIds?: string[];
    tableIds?: string[];
    categoryIds?: string[];
    canTakeOrders?: boolean;
    canTakePayment?: boolean;
    canCancelAndDiscount?: boolean;
    canTransferAndReserve?: boolean;
    canApplyDiscount?: boolean;
    maxDiscountPercent?: number;
    canTransferTables?: boolean;
    /** Kasiyer paket siparişleri görür mü; garson hiç görmez, diğer roller hep görür. */
    canViewDelivery?: boolean;
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

/** Kasiyer ekranında hangi işlemlerin gösterileceği. Sunucu da aynı kuralları uygular. */
export interface CashierPermissions {
    canApplyDiscount: boolean;
    /** Bir ödemede uygulanabilecek en yüksek indirim yüzdesi; 100 = sınırsız. */
    maxDiscountPercent: number;
    canTransferTables: boolean;
    canViewDelivery: boolean;
}

export const ALL_CASHIER_PERMISSIONS: CashierPermissions = {
    canApplyDiscount: true, maxDiscountPercent: 100, canTransferTables: true, canViewDelivery: true,
};

export function cashierPermissionsOf(user: User): CashierPermissions {
    return {
        canApplyDiscount: user.canApplyDiscount ?? true,
        maxDiscountPercent: user.maxDiscountPercent ?? 100,
        canTransferTables: user.canTransferTables ?? true,
        canViewDelivery: user.canViewDelivery ?? true,
    };
}
