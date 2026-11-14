using System.Security.Cryptography;

namespace RestaurantBill.Domain.Shared;

// Müşterinin telefonda okuyup yazabileceği kısa rezervasyon kodu: 6 büyük harf/rakam, karışan karakterler yok
// (0/O, 1/I/L). Saklanan biçim tiresiz "K7M2QP"; gösterilen biçim "K7M-2QP". Gizli değildir: tek başına
// rezervasyonu açmaz, sorgulamada telefon numarasıyla birlikte istenir. Rastgele üretilir (kimlikten türetilmez).
public static class ReservationCode
{
    public const int Length = 6;
    public const string Alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    public static string New() => RandomNumberGenerator.GetString(Alphabet, Length);

    /// <summary>"k7m-2qp", " K7M 2QP " → "K7M2QP". Biçim tutmuyorsa (uzunluk ya da alfabe dışı karakter) boş döner.</summary>
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        string compact = new(value.Where(c => !char.IsWhiteSpace(c) && c != '-').Select(char.ToUpperInvariant).ToArray());
        return compact.Length == Length && compact.All(c => Alphabet.Contains(c)) ? compact : string.Empty;
    }

    /// <summary>"K7M2QP" → "K7M-2QP". Geçersizse olduğu gibi döner.</summary>
    public static string Format(string? code)
    {
        string normalized = Normalize(code);
        return normalized.Length == Length ? $"{normalized[..3]}-{normalized[3..]}" : code ?? string.Empty;
    }
}
