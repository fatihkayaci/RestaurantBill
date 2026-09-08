namespace RestaurantBill.Application.DTOs;

public class LoginResponseDto
{
    public string? Token { get; set; }
    public bool NeedsSlugSetup { get; set; }
    public bool NeedsPhoneVerification { get; set; }

    // Controller cookie'ye yazıp response'tan temizler; Application katmanı HttpContext bilmez.
    public string? RefreshToken { get; set; }
    public DateTime RefreshTokenExpiresAt { get; set; }

    // İstekteki RememberMe değil, sunucu tarafı rol kısıtından geçmiş asıl değer (örn. Waiter için her zaman false).
    public bool RememberMe { get; set; }
}