namespace RestaurantBill.Application.DTOs
{
    public class BranchDto : RestaurantDto
    {
        public int TableCount { get; set; }
        public int StaffCount { get; set; }
        public decimal Revenue { get; set; }
        public string? ManagerName { get; set; }
    }
}
