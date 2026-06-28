export interface User {
    id: string;
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

export interface UpdateUser {
    id: string;
    fullName: string;
    userName: string;
    email?: string;
    phoneNumber: string;
    password?: string;
    userCode: string;
    role: number;
}

export interface TopProduct {
    name: string;
    sold: number;
}

export interface OverviewStats {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    occupiedTables: number;
    totalTables: number;
    topProducts: TopProduct[];
}

export interface Restaurant {
    name: string;
    phoneNumber: string;
    mobilePhoneNumber: string;
    email: string;
    city: string;
    district: string;
}

export interface CreateRestaurant {
    name: string;
    phoneNumber: string;
    mobilePhoneNumber: string;
    email: string;
    city: string;
    district: string;
}
