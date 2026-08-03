export interface OrderItem {
    id: number;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    status: number;
    is_load: boolean;
}

export interface Order {
    id: number;
    tableId: string;
    note: string;
    totalPrice: number;
    status: number;
    orderItems: OrderItem[];
}
