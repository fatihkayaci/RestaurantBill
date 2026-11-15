using System.Security.Cryptography;

namespace RestaurantBill.Domain.Shared;

// Müşteriye verilen bağlantılardaki (paket takip, rezervasyon) gizli anahtar. Kimlikten türetilmez: 128 bit rastgele,
// 32 küçük harf onaltılık karakter.
public static class AccessToken
{
    public const int Length = 32;

    public static string New() => Convert.ToHexString(RandomNumberGenerator.GetBytes(Length / 2)).ToLowerInvariant();
}
