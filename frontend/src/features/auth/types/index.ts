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
    transitionToken?: string;
    restaurants?: RestaurantSelection[];
}
