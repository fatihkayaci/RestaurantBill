using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Services;

// Rate limit kovalarıyla aynı kural: API nginx arkasında çalışır, bağlantı adresi hep 127.0.0.1 olur; bu yüzden önce
// proxy'nin yazdığı X-Forwarded-For'un ilk adresine bakılır.
public class ClientInfoService : IClientInfo
{
    public string IpAddress { get; }

    public ClientInfoService(IHttpContextAccessor httpContextAccessor)
    {
        HttpContext? context = httpContextAccessor.HttpContext;
        string? forwarded = context?.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
        string ip = !string.IsNullOrWhiteSpace(forwarded) ? forwarded : context?.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
        IpAddress = ip.Length > 64 ? ip[..64] : ip;
    }
}
