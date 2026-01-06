namespace RestaurantBill.Infrastructure.DTOs.UserDtos;

public class UserResponse
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
