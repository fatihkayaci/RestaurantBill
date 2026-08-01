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
}
