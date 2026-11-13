using System.Numerics;
using System.Text;

namespace RestaurantBill.Domain.Shared;

// Türkiye IBAN'ı: "TR" + 2 kontrol hanesi + 22 hane = 26 karakter, ISO 13616 mod-97 kontrolü.
public static class TurkishIban
{
    public const int Length = 26;

    /// <summary>Boşlukları atar, büyük harfe çevirir: "tr33 0006 1005..." → "TR330006100...".</summary>
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        StringBuilder sb = new(value.Length);
        foreach (char c in value)
        {
            if (char.IsWhiteSpace(c) || c == '-') continue;
            sb.Append(char.ToUpperInvariant(c));
        }
        return sb.ToString();
    }

    public static bool IsValid(string? value)
    {
        string iban = Normalize(value);
        if (iban.Length != Length || !iban.StartsWith("TR", StringComparison.Ordinal))
            return false;

        for (int i = 2; i < iban.Length; i++)
            if (!char.IsAsciiDigit(iban[i])) return false;

        // İlk dört karakter sona alınır, harfler sayıya çevrilir (A=10 … Z=35); sonuç mod 97 = 1 olmalı.
        string rearranged = iban[4..] + iban[..4];
        StringBuilder digits = new(rearranged.Length + 4);
        foreach (char c in rearranged)
            digits.Append(char.IsAsciiDigit(c) ? c.ToString() : (c - 'A' + 10).ToString());

        return BigInteger.Parse(digits.ToString()) % 97 == 1;
    }

    /// <summary>Okunur biçim: "TR33 0006 1005 1978 6457 8413 26".</summary>
    public static string Format(string iban)
    {
        string normalized = Normalize(iban);
        StringBuilder sb = new(normalized.Length + normalized.Length / 4);
        for (int i = 0; i < normalized.Length; i++)
        {
            if (i > 0 && i % 4 == 0) sb.Append(' ');
            sb.Append(normalized[i]);
        }
        return sb.ToString();
    }
}
