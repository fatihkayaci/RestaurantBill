using System.Threading.RateLimiting;

namespace RestaurantBill.WebAPI.Extensions;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.AddPolicy("auth", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            // Müşteri sitesi (girişsiz uçlar): okuma bol, yazma (sipariş/rezervasyon talebi) sıkı.
            options.AddPolicy("public-read", context => PerClientWindow(context, "public-read", 120));
            // Restoran sitesinin sayfa açılışı (index.html + başlık etiketleri): tarayıcılar ve arama botları; aşılırsa
            // 429 döner ve nginx sayfayı doğrudan ön yüzden verir (etiketsiz), site yine açılır.
            options.AddPolicy("public-html", context => PerClientWindow(context, "public-html", 300));
            options.AddPolicy("public-write", context => PerClientWindow(context, "public-write", 20));
            // Masa QR'ı "Garson çağır" / "Hesap iste": masa başına 60 sn bekleme sunucuda ayrıca uygulanır; bu sınır
            // tek bir cihazın masa masa dolaşıp garsonları meşgul etmesini keser.
            options.AddPolicy("public-table-action", context => PerClientWindow(context, "public-table-action", 6));
            // Online paket sipariş gönderimi: IP başına 10 dakikada 5. Sunucu ayrıca numara ve IP başına sınır uygular.
            options.AddPolicy("delivery-write", context => PerClientWindow(context, "delivery-write", 5, TimeSpan.FromMinutes(10)));
            // SMS doğrulama kodu gönder/doğrula: IP başına 10 dakikada 10 (numara başına bekleme ve saatlik sınır sunucuda).
            options.AddPolicy("otp", context => PerClientWindow(context, "otp", 10, TimeSpan.FromMinutes(10)));
            // "Rezervasyon sorgula" (kod + telefon): IP başına 10 dakikada 10. Kod başına 5 hatalı denemede 15 dakikalık
            // kilit sunucuda ayrıca uygulanır (ReservationLookupGuard).
            options.AddPolicy("reservation-lookup", context => PerClientWindow(context, "reservation-lookup", 10, TimeSpan.FromMinutes(10)));

            // "Verileri sil" sayfası (yalnızca sahip): önizleme/indirme kullanıcı başına 10 dakikada 30; silme, sıfırlama,
            // hesap kapatma ve vazgeçme 10 dakikada 5. Şifre de bu uçlarda denendiği için tahmin denemesini de keser.
            options.AddPolicy("data-read", context => PerUserWindow(context, "data-read", 30, TimeSpan.FromMinutes(10)));
            options.AddPolicy("data-danger", context => PerUserWindow(context, "data-danger", 5, TimeSpan.FromMinutes(10)));

            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });

        return services;
    }

    // Girişli uçlar: kova kullanıcıdır (aynı IP'deki başka restoranlar etkilenmez); kimliksizse istemci adresi.
    private static RateLimitPartition<string> PerUserWindow(HttpContext context, string policy, int permitLimit, TimeSpan window)
    {
        string? userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
            return PerClientWindow(context, policy, permitLimit, window);

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{policy}:user:{userId}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = window,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    }

    // Sunucuda API nginx arkasında çalışır; bağlantı adresi hep 127.0.0.1 olur ve tüm müşteriler tek
    // kovaya düşer. Bu yüzden önce proxy'nin yazdığı X-Forwarded-For'un ilk adresine bakılır.
    private static RateLimitPartition<string> PerClientWindow(HttpContext context, string policy, int permitLimit)
        => PerClientWindow(context, policy, permitLimit, TimeSpan.FromMinutes(1));

    private static RateLimitPartition<string> PerClientWindow(HttpContext context, string policy, int permitLimit, TimeSpan window)
    {
        string? forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
        string client = !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded
            : context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{policy}:{client}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = window,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    }
}
