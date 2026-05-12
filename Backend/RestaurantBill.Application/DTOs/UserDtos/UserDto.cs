using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public required string FullName { get; set; }
    public required string UserName { get; set; }
    public string? Email { get; set; }
    public required string PhoneNumber { get; set; }
    public required string UserCode { get; set; }
    public UserRole Role { get; set; }
}
