namespace RestaurantBill.Application.DTOs.Reports;

public class TaxReportDto
{
    public List<TaxRateRowDto> Rates { get; set; } = [];
    public decimal TotalMatrah { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalAmount { get; set; }
}

public class TaxRateRowDto
{
    public decimal TaxRatePercent { get; set; }
    public decimal Matrah { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
}
