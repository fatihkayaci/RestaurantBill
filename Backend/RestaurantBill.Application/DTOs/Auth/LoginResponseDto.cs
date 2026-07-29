namespace RestaurantBill.Application.DTOs;

public class LoginResponseDto
{
    public string? Token { get; set; }
    public bool NeedsSlugSetup { get; set; }
    public string? TransitionToken { get; set; }
    public List<RestaurantSelectionDto>? Restaurants { get; set; }
}

public class RestaurantSelectionDto
{
    public int RestaurantId { get; set; }
    public string RestaurantName { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string Role { get; set; } = default!;
}
