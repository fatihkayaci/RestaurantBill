namespace RestaurantBill.Application.DTOs;

public class RegisterResponseDto
{
    public string? Token { get; set; }
    public bool NeedsSlugSetup { get; set; }
}