export interface OrderItem {
    id: number;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    status: number;
    is_load: boolean;
    categoryName: string;
    taxRate: number;
}

export interface Order {
    id: number;
    tableId: string;
    tableName: string;
    note: string;
    totalPrice: number;
    status: number;
    createdAt: string;
    createdByUserName: string;
    orderItems: OrderItem[];
}
