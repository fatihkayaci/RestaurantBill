export interface Restaurant {
    id: string;
    name: string;
    phoneNumber: string;
    mobilePhoneNumber: string;
    email: string;
    city: string;
    district: string;
    slug: string;
}

export interface Branch {
    id: string;
    branchName: string;
    managerName: string;
    number: string;
    email: string;
    city: string;
    district: string;
    openAddress: string;
    taxRate: number;
    tableCount: number;
    staffCount: number;
    revenue: number;
}

export interface CreateRestaurant {
    name: string;
    phoneNumber: string;
    mobilePhoneNumber: string;
    email: string;
    city: string;
    district: string;
}

export interface CreateBranch {
    name: string;
    managerName: string;
    phoneNumber: string;
    email: string;
    city: string;
    district: string;
    openAddress: string;
    taxRate: string;
}

export interface UpdateBranch {
    name: string;
    managerName: string;
    phoneNumber: string;
    email: string;
    city: string;
    district: string;
    openAddress: string;
    taxRate: string;
}
