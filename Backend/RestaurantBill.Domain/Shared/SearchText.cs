using System.Globalization;
using System.Text;

namespace RestaurantBill.Domain.Shared;

/// <summary>
/// Arama için metni sadeleştirir: küçük harf, Türkçe harfler ve aksanlar düz Latin harfine ("Çay" → "cay",
/// "İskender" → "iskender", "ılık" → "ilik"), boşluklar teke iner. Kullanıcı "cay" yazınca "Çay" bulunur.
/// </summary>
public static class SearchText
{
    public static string Fold(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        var builder = new StringBuilder(text.Length);
        foreach (char c in text.Trim())
        {
            builder.Append(c switch
            {
                'İ' or 'I' or 'ı' => 'i',
                'Ç' or 'ç' => 'c',
                'Ğ' or 'ğ' => 'g',
                'Ö' or 'ö' => 'o',
                'Ş' or 'ş' => 's',
                'Ü' or 'ü' => 'u',
                _ => char.ToLowerInvariant(c)
            });
        }

        // Kalan aksanlar (â, î, û, é…): ayrıştırıp birleşen işaretleri at.
        string decomposed = builder.ToString().Normalize(NormalizationForm.FormD);
        builder.Clear();
        bool lastWasSpace = false;
        foreach (char c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                continue;
            if (char.IsWhiteSpace(c))
            {
                if (!lastWasSpace)
                    builder.Append(' ');
                lastWasSpace = true;
                continue;
            }
            builder.Append(c);
            lastWasSpace = false;
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }
}
