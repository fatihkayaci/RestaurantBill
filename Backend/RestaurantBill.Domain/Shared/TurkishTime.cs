using System.Globalization;

namespace RestaurantBill.Domain.Shared;

// Saat ifadelerine Türkçe ek: "12:00'ye kadar", "18:00'den itibaren". Ek, saatin okunuşunun son kelimesine göre
// seçilir ("on iki" → 'ye, "on sekiz" → 'den, "on iki otuz" → 'a).
public static class TurkishTime
{
    private static readonly string[] Ones = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
    private static readonly string[] Tens = ["", "on", "yirmi", "otuz", "kırk", "elli"];

    public static string Format(TimeOnly time) => time.ToString("HH:mm", CultureInfo.InvariantCulture);

    /// <summary>"12:00'ye", "10:00'a", "12:30'a".</summary>
    public static string Dative(TimeOnly time)
    {
        string word = LastWord(time);
        bool front = IsFrontVowel(LastVowel(word));
        bool endsWithVowel = IsVowel(word[^1]);
        string suffix = (endsWithVowel ? "y" : string.Empty) + (front ? "e" : "a");
        return $"{Format(time)}'{suffix}";
    }

    /// <summary>"18:00'den", "15:00'ten", "16:00'dan".</summary>
    public static string Ablative(TimeOnly time)
    {
        string word = LastWord(time);
        bool front = IsFrontVowel(LastVowel(word));
        bool voiceless = "çfhkpsşt".Contains(word[^1]);
        string suffix = (voiceless ? "t" : "d") + (front ? "en" : "an");
        return $"{Format(time)}'{suffix}";
    }

    private static string LastWord(TimeOnly time)
    {
        int number = time.Minute > 0 ? time.Minute : time.Hour;
        if (number == 0) return "sıfır";
        return number % 10 != 0 ? Ones[number % 10] : Tens[number / 10];
    }

    private static bool IsVowel(char c) => "aeıioöuü".Contains(c);
    private static bool IsFrontVowel(char c) => "eiöü".Contains(c);
    private static char LastVowel(string word) => word.Last(IsVowel);
}
