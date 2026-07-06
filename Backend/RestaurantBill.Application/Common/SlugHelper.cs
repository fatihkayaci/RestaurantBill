using System.Text;
using System.Text.RegularExpressions;

namespace RestaurantBill.Application.Common;

public static class SlugHelper
{
    private static readonly Dictionary<char, char> TurkishMap = new()
    {
        ['ş'] = 's', ['Ş'] = 's',
        ['ğ'] = 'g', ['Ğ'] = 'g',
        ['ü'] = 'u', ['Ü'] = 'u',
        ['ö'] = 'o', ['Ö'] = 'o',
        ['ç'] = 'c', ['Ç'] = 'c',
        ['ı'] = 'i', ['İ'] = 'i',
    };

    public static string Slugify(string input)
    {
        StringBuilder sb = new(input.Length);
        foreach (char c in input.ToLowerInvariant())
            sb.Append(TurkishMap.TryGetValue(c, out char mapped) ? mapped : c);

        string slug = Regex.Replace(sb.ToString(), "[^a-z0-9]+", "-").Trim('-');
        return slug;
    }
}
