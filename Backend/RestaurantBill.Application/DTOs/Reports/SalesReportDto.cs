using RestaurantBill.Application.DTOs.Stats;

namespace RestaurantBill.Application.DTOs.Reports;

public class SalesReportDto
{
    public decimal TotalRevenue { get; set; }
    public decimal TotalMatrah { get; set; }
    public decimal TotalTax { get; set; }
    public int TransactionCount { get; set; }
    public decimal AvgBasket { get; set; }

    /// <summary>Aralık tek günse saatlik (24 nokta), çok günse günlük (iş günü bazlı) noktalar.</summary>
    public List<SalesTrendPointDto> Trend { get; set; } = [];
    public List<PaymentMethodBreakdownDto> PaymentMethods { get; set; } = [];
    public List<SalesHeatmapPointDto> Heatmap { get; set; } = [];

    /// <summary>Sadece Owner + birden çok şube kapsamdayken dolu.</summary>
    public List<BranchSalesRowDto> BranchComparison { get; set; } = [];
}

public class SalesTrendPointDto
{
    /// <summary>Saatlik görünümde saat (0-23), günlük görünümde iş günü.</summary>
    public string Label { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public Dictionary<Guid, decimal> ByBranch { get; set; } = [];
}

public class SalesHeatmapPointDto
{
    /// <summary>0 = Pazartesi ... 6 = Pazar.</summary>
    public int DayOfWeek { get; set; }
    public int Hour { get; set; }
    public decimal Amount { get; set; }
    public int Count { get; set; }
}

public class BranchSalesRowDto
{
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int TransactionCount { get; set; }
    public decimal AvgBasket { get; set; }
    public decimal RevenueChangePercent { get; set; }
}
