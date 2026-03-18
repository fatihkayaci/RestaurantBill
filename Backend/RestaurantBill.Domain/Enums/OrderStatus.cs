namespace RestaurantBill.Domain.Enums;
public enum OrderStatus
{
    Active = 1,
    Pending = 2,
    Preparing = 3,
    Ready = 4,
    Served = 5,
    Paid = 6,
    Cancelled = 7
}