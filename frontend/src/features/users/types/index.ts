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
}

export interface CreateUser {
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

export interface UpdateUser {
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
