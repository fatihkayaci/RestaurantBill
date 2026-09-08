namespace RestaurantBill.Application.DTOs;

public class RefreshTokenResponseDto
{
    public string AccessToken { get; set; } = string.Empty;

    // Controller cookie'ye yazıp response'tan temizler; Application katmanı HttpContext bilmez.
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime RefreshTokenExpiresAt { get; set; }
    public bool RememberMe { get; set; }
}
