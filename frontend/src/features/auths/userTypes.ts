export interface User {
    id: number;
    fullName: string;
    userName: string;
    email?: string;
    phoneNumber: string;
    userCode: string;
    role: number;
}

export interface CreateUser {
    fullName: string;
    userName: string;
    email?: string;
    phoneNumber: string;
    passwordHash: string;
    userCode: string;
    role: number;
}
