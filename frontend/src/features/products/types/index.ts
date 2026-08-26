export const ImageFocus = {
    Top: 1,
    Center: 2,
    Bottom: 3,
} as const;

export type ImageFocus = typeof ImageFocus[keyof typeof ImageFocus];

export const imageFocusToObjectPosition: Record<ImageFocus, string> = {
    [ImageFocus.Top]: 'center top',
    [ImageFocus.Center]: 'center center',
    [ImageFocus.Bottom]: 'center bottom',
};

export interface Product {
    id: string;
    name: string;
    price: number;
    isActive: boolean;
    categoryId: string;
    categoryName: string;
    imageUrl: string;
    imageFocus: ImageFocus;
}

export interface CreateProduct {
    name: string;
    price: number;
    isActive: boolean;
    categoryId: string;
}

export interface UpdateProduct {
    id: string;
    name: string;
    price: number;
    isActive: boolean;
    categoryId: string;
}
