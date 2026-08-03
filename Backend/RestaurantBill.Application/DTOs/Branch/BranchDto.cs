namespace RestaurantBill.Application.DTOs
{
    public class BranchDto
    {
        public Guid Id { get; set; }
        public required string BranchName { get; set; }
        public string ManagerName { get; set; } = string.Empty;
        public string Number { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string OpenAddress { get; set; } = string.Empty;
        public int TableCount { get; set; }
        public int StaffCount { get; set; }
        public decimal Revenue { get; set; }
    }
}
