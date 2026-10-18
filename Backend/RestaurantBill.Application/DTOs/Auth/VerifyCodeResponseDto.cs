namespace RestaurantBill.Application.DTOs;

public class VerifyCodeResponseDto
{
    public string? Token { get; set; }
    public bool NeedsSlugSetup { get; set; }

    // Controller cookie'ye yazıp response'tan temizler; aynı tarayıcıda kalmış eski bir oturumun cookie'sini de ezer.
    public string? RefreshToken { get; set; }
    public DateTime RefreshTokenExpiresAt { get; set; }
}