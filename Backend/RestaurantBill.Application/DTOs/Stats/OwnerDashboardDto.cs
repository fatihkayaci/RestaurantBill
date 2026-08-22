using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs.Stats
{
    public class OwnerDashboardDto
    {
        public decimal TotalRevenue { get; set; }
        public decimal TotalRevenueChangePercent { get; set; }
        public int TotalOrders { get; set; }
        public decimal TotalOrdersChangePercent { get; set; }
        public decimal AvgOrderValue { get; set; }
        public decimal AvgOrderValueChangePercent { get; set; }
        public int ActiveBranchCount { get; set; }
        public int TotalBranchCount { get; set; }
        public int MembershipExpiringBranchCount { get; set; }
        public List<RevenueTrendPointDto> Trend { get; set; } = [];
        public List<PaymentMethodBreakdownDto> PaymentMethods { get; set; } = [];
        public List<BranchPerformanceDto> BranchPerformance { get; set; } = [];
    }

    public class RevenueTrendPointDto
    {
        public DateTime Date { get; set; }
        public decimal Total { get; set; }
        public Dictionary<Guid, decimal> ByBranch { get; set; } = [];
    }

    public class PaymentMethodBreakdownDto
    {
        public PaymentMethod Method { get; set; }
        public decimal Amount { get; set; }
        public decimal Percent { get; set; }
    }

    public class BranchPerformanceDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal TodayRevenue { get; set; }
        public decimal TodayRevenueChangePercent { get; set; }
        public int TodayOrders { get; set; }
        public decimal TodayOrdersChangePercent { get; set; }
        public decimal AvgBasket { get; set; }
        public int StaffCount { get; set; }
        public int OpenTables { get; set; }
        public int TotalTables { get; set; }
        public int PendingOrders { get; set; }
    }
}
