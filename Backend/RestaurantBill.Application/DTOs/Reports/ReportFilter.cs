namespace RestaurantBill.Application.DTOs.Reports;

public class ReportFilter
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public Guid? BranchId { get; set; }
}
