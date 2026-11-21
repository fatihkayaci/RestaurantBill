using System.Globalization;

namespace RestaurantBill.Application.Common;

/// <summary>
/// Masaların ekranlardaki sırası: bölge sırası → bölge adı → masa sırası → masa adı (doğal sıra).
/// Sıra eşitse ad doğal sırayla karşılaştırılır: "Masa 2", "Masa 10"dan önce gelir.
/// </summary>
public static class TableOrdering
{
    public static IEnumerable<T> OrderForDisplay<T>(
        this IEnumerable<T> source,
        Func<T, int> regionSortOrder,
        Func<T, string> regionName,
        Func<T, int> tableSortOrder,
        Func<T, string> tableName)
        => source
            .OrderBy(regionSortOrder)
            .ThenBy(regionName, NaturalStringComparer.Instance)
            .ThenBy(tableSortOrder)
            .ThenBy(tableName, NaturalStringComparer.Instance);

    /// <summary>Tek bölgenin masaları: masa sırası → masa adı (doğal sıra).</summary>
    public static IEnumerable<T> OrderInRegion<T>(this IEnumerable<T> source, Func<T, int> tableSortOrder, Func<T, string> tableName)
        => source.OrderBy(tableSortOrder).ThenBy(tableName, NaturalStringComparer.Instance);
}

/// <summary>Metindeki sayıları sayı olarak karşılaştırır ("Masa 2" &lt; "Masa 10"); harfler Türkçe, büyük/küçük harf duyarsız.</summary>
public sealed class NaturalStringComparer : IComparer<string>
{
    public static readonly NaturalStringComparer Instance = new();

    private static readonly CompareInfo Turkish = CultureInfo.GetCultureInfo("tr-TR").CompareInfo;

    public int Compare(string? x, string? y)
    {
        if (ReferenceEquals(x, y)) return 0;
        if (x is null) return -1;
        if (y is null) return 1;

        int i = 0, j = 0;
        while (i < x.Length && j < y.Length)
        {
            bool xDigit = char.IsAsciiDigit(x[i]);
            bool yDigit = char.IsAsciiDigit(y[j]);
            int xEnd = RunEnd(x, i, xDigit);
            int yEnd = RunEnd(y, j, yDigit);

            int result;
            if (xDigit && yDigit)
                result = CompareNumbers(x.AsSpan(i, xEnd - i), y.AsSpan(j, yEnd - j));
            else
                result = Turkish.Compare(x, i, xEnd - i, y, j, yEnd - j, CompareOptions.IgnoreCase);

            if (result != 0) return result;
            i = xEnd;
            j = yEnd;
        }

        int lengthResult = (x.Length - i).CompareTo(y.Length - j);
        // Doğal olarak eşit ("Masa 01" / "Masa 1"): sıra sabit kalsın diye düz karşılaştırmaya düşülür.
        return lengthResult != 0 ? lengthResult : string.CompareOrdinal(x, y);
    }

    private static int RunEnd(string s, int start, bool digits)
    {
        int end = start;
        while (end < s.Length && char.IsAsciiDigit(s[end]) == digits) end++;
        return end;
    }

    // Baştaki sıfırlar atılır; kısa sayı küçüktür, eşit uzunlukta rakam rakam karşılaştırılır (taşma olmaz).
    private static int CompareNumbers(ReadOnlySpan<char> a, ReadOnlySpan<char> b)
    {
        a = a.TrimStart('0');
        b = b.TrimStart('0');
        if (a.Length != b.Length) return a.Length.CompareTo(b.Length);
        return a.SequenceCompareTo(b);
    }
}
