namespace RestaurantBill.Application.DTOs.Reports;

public class ProductReportDto
{
    public List<ProductSalesRowDto> Products { get; set; } = [];
    public List<CategorySalesRowDto> CategoryBreakdown { get; set; } = [];
    public List<NeverSoldProductDto> NeverSoldProducts { get; set; } = [];
}

public class ProductSalesRowDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int Sold { get; set; }

    /// <summary>İndirim etkisi düşülmüş (Payment.DiscountAmount oranıyla ölçeklenmiş) ciro.</summary>
    public decimal Revenue { get; set; }
    public decimal AvgUnitPrice { get; set; }
}

public class CategorySalesRowDto
{
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int Sold { get; set; }
    public decimal Revenue { get; set; }
    public decimal Percent { get; set; }
}

public class NeverSoldProductDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
