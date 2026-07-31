namespace RestaurantBill.Application.DTOs;

public class VerifyCodeResponseDto
{
    public string? Token { get; set; }
    public bool NeedsSlugSetup { get; set; }
}