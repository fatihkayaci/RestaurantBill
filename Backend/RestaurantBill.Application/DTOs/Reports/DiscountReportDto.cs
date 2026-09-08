namespace RestaurantBill.Application.DTOs.Reports;

public class DiscountReportDto
{
    public decimal TotalDiscountAmount { get; set; }
    public decimal GrossRevenue { get; set; }
    public decimal DiscountToRevenuePercent { get; set; }
    public int DiscountedPaymentCount { get; set; }

    /// <summary>DiscountNote doldurulmuş indirimli ödeme oranı.</summary>
    public decimal NoteFilledPercent { get; set; }

    public List<DiscountUserRowDto> UserBreakdown { get; set; } = [];
    public List<DiscountBucketDto> PercentDistribution { get; set; } = [];
    public List<CancelledOrderRowDto> CancelledOrders { get; set; } = [];
}

public class DiscountUserRowDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}

public class DiscountBucketDto
{
    /// <summary>Örn. "0-10", "10-25", "25-50", "50-100".</summary>
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}

public class CancelledOrderRowDto
{
    public Guid OrderId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string ActorName { get; set; } = string.Empty;
    public DateTime CancelledAt { get; set; }
    public decimal Amount { get; set; }
}
