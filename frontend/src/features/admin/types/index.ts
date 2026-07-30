export interface User {
    id: string;
    fullName: string;
    userName: string;
    email?: string;
    phoneNumber: string;
    userCode: string;
    role: number;
    isActive: boolean;
    restaurantId: number;
    restaurantName?: string | null;
}

export interface CreateUser {
    fullName: string;
    userName: string;
    email?: string;
    phoneNumber: string;
    passwordHash: string;
    userCode: string;
    role: number;
    restaurantId?: number;
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
    isActive?: boolean;
    restaurantId?: number;
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
    id: number;
    name: string;
    phoneNumber: string;
    mobilePhoneNumber: string;
    email: string;
    city: string;
    district: string;
    slug: string;
}

export interface Branch extends Restaurant {
    tableCount: number;
    staffCount: number;
    revenue: number;
    managerName?: string | null;
}

export interface CreateRestaurant {
    name: string;
    phoneNumber: string;
    mobilePhoneNumber: string;
    email: string;
    city: string;
    district: string;
}

export const MembershipPlanType = {
    Free: 1,
    Basic: 2,
    Premium: 3,
} as const;
export type MembershipPlanType = typeof MembershipPlanType[keyof typeof MembershipPlanType];

export const MembershipStatus = {
    Active: 1,
    Expired: 2,
    Cancelled: 3,
} as const;
export type MembershipStatus = typeof MembershipStatus[keyof typeof MembershipStatus];

export interface Membership {
    id: number;
    planType: MembershipPlanType;
    status: MembershipStatus;
    startDate: string;
    endDate: string;
}
