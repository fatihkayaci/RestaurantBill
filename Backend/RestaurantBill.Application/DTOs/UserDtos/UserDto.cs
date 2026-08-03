using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class UserDto
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public required string UserName { get; set; }
    public string? Email { get; set; }
    public required string PhoneNumber { get; set; }
    public required string UserCode { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
    public Guid BranchId { get; set; }
    public string? BranchName { get; set; }
    public DateTime? HireDate { get; set; }
}
