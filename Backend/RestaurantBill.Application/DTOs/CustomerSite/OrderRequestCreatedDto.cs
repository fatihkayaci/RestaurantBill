namespace RestaurantBill.Application.DTOs;

// Live notification sent when a customer submits an order from the table QR menu. Staff screens use it to
// light up the table card and show a toast until a waiter approves or rejects the request.
public class OrderRequestCreatedDto
{
    public Guid RequestId { get; set; }
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public Guid RegionId { get; set; }
    public string RegionName { get; set; } = string.Empty;
    // Total quantity of all lines in the request (2x tea + 1x menu = 3).
    public int ItemCount { get; set; }
    // Of which marked "Paket olsun" by the customer (takeaway).
    public int TakeawayCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
