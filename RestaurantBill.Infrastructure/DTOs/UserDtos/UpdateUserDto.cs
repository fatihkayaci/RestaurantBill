namespace RestaurantBill.Infrastructure.DTOs.UserDtos;

public class UpdateUserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; }
}
