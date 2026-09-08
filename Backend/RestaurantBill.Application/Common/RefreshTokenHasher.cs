using System.Security.Cryptography;
using System.Text;

namespace RestaurantBill.Application.Common;

public static class RefreshTokenHasher
{
    public static string GenerateRawToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public static string Hash(string rawToken)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }
}
