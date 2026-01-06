namespace RestaurantBill.Infrastructure.DTOs.Order;

public class OrderResponse
{
    public int Id { get; set; }
    public int Status { get; set; }
    public decimal TotalPrice { get; set; } // Hesaplanan fiyat burada döner
    public DateTime CreatedDate { get; set; } // Tarih de lazım olur
    
    // Detay isimler
    public string TableName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
}
