namespace RestaurantBill.Core.DTOs;
public class OrderResponse
{
    public int Id { get; set; }
    public int Status { get; set; }
    public decimal TotalPrice { get; set; } // Hesaplanan fiyat burada döner
    public DateTime CreatedDate { get; set; } // Tarih de lazım olur
    public List<OrderItemResponse> OrderItems { get; set; } = new List<OrderItemResponse>();
    // Detay isimler
    public string TableName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
}
