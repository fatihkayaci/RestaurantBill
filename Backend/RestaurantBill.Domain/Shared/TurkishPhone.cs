namespace RestaurantBill.Domain.Shared;

// Türkiye telefon numarası; karşılaştırma ve engelleme için tek biçim: "+90" + 10 hane ("+905321234567").
public static class TurkishPhone
{
    public const int NormalizedLength = 13;

    /// <summary>"0532 123 45 67", "+90 532 123 4567", "5321234567" → "+905321234567". Geçersizse boş döner.</summary>
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        string digits = new(value.Where(char.IsAsciiDigit).ToArray());
        if (digits.Length == 12 && digits.StartsWith("90", StringComparison.Ordinal))
            digits = digits[2..];
        else if (digits.Length == 11 && digits[0] == '0')
            digits = digits[1..];

        return digits.Length == 10 && digits[0] != '0' ? "+90" + digits : string.Empty;
    }

    public static bool IsValid(string? value) => Normalize(value).Length == NormalizedLength;
}
