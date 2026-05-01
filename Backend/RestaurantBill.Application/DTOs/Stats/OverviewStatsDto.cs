namespace RestaurantBill.Application.DTOs.Stats
{
    public class OverviewStatsDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public decimal AvgOrderValue { get; set; }
        public int OccupiedTables { get; set; }
        public int TotalTables { get; set; }
        public List<TopProductDto> TopProducts { get; set; } = [];
    }

    public class TopProductDto
    {
        public string Name { get; set; } = string.Empty;
        public int Sold { get; set; }
    }
}
