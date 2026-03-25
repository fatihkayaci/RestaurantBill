export interface OrderItem{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    status: number;
    is_load: boolean;
}
export interface Order {
    id: number;
    tableId: number;
    note: string;
    totalPrice: number;
    status: number;
    orderItems: OrderItem[];
}