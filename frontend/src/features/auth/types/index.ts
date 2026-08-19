export interface Register {
    fullName: string;
    phoneNumber: string;
    email: string;
    password: string;
    restaurantName: string;
}

export interface RestaurantSelection {
    restaurantId: number;
    restaurantName: string;
    slug: string;
    role: string;
}

export interface LoginResponse {
    token?: string;
    needsSlugSetup?: boolean;
    needsPhoneVerification?: boolean;
}
export interface RegisterResponse {
    token: string;
}
export const VerificationCodeType = {
    Phone: 1,
    Email: 2,
} as const;

export type VerificationCodeType = typeof VerificationCodeType[keyof typeof VerificationCodeType];
export interface VerificationCode {
    userId: string;
    verificationCodeType: VerificationCodeType;
}
export interface Code {
    userId: string;
    Code: string;
    type: VerificationCodeType;
}
export interface VerifyCodeResponse {
    token: string;
    needsSlugSetup?: boolean;
}
