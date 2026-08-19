namespace RestaurantBill.Application.DTOs;

public class LoginResponseDto
{
    public string? Token { get; set; }
    public bool NeedsSlugSetup { get; set; }
    public bool NeedsPhoneVerification { get; set; }
}