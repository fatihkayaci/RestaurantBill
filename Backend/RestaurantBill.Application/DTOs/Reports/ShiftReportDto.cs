namespace RestaurantBill.Application.DTOs.Reports;

public class ShiftReportDto
{
    public decimal TotalDifference { get; set; }
    public int UncountedCount { get; set; }
    public int AutoClosedCount { get; set; }
    public int PendingReviewCount { get; set; }

    /// <summary>Admin ya da Owner'ın tek bir şube seçtiği durumda dolu.</summary>
    public List<ShiftDto> Shifts { get; set; } = [];

    /// <summary>Owner'ın birden çok şubeyi kapsadığı durumda dolu.</summary>
    public List<BranchShiftSummaryRowDto> BranchSummaries { get; set; } = [];
}

public class BranchShiftSummaryRowDto
{
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int ShiftCount { get; set; }
    public decimal TotalDifference { get; set; }
    public int UncountedCount { get; set; }
    public int AutoClosedCount { get; set; }
}
