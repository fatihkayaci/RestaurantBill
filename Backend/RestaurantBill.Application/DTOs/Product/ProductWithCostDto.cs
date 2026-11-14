namespace RestaurantBill.Application.DTOs;

/// <summary>
/// Admin/Owner menü ekranı için ürün: maliyet yalnızca burada döner.
/// Garson, mutfak ve kasa <see cref="ProductDto"/> kullanır, maliyeti görmez.
/// </summary>
public class ProductWithCostDto : ProductDto
{
    public decimal Cost { get; set; }
}
