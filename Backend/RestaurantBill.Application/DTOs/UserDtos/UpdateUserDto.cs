using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class UpdateUserDto
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public string? Email { get; set; }
    public required string PhoneNumber { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
}
