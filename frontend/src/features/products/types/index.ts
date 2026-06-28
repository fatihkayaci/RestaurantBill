export interface Product {
    id: number;
    name: string;
    price: number;
    isActive: boolean;
    categoryId: number;
    categoryName: string;
}

export interface CreateProduct {
    name: string;
    price: number;
    isActive: boolean;
    categoryId: number;
}

export interface UpdateProduct {
    id: number;
    name: string;
    price: number;
    isActive: boolean;
    categoryId: number;
}
