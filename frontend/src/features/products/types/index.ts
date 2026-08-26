export interface Product {
    id: string;
    name: string;
    price: number;
    isActive: boolean;
    categoryId: string;
    categoryName: string;
    imageUrl: string;
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
