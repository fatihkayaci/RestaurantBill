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
