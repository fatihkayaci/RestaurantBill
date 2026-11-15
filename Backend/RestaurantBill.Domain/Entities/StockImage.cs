using System.Globalization;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Entities
{
    /// <summary>
    /// Hazır görsel kütüphanesinin bir fotoğrafı ("Adana", "Çay"). Şubeye ya da şirkete bağlı değildir: dosya CDN'de
    /// <see cref="StorageKeys.StockPrefix"/> altında bir kez durur, onu seçen her ürün yalnızca bu anahtarı saklar.
    /// Paylaşılan dosya hiçbir ürün işleminde silinmez (bkz. <see cref="StorageKeys.IsShared"/>).
    /// </summary>
    public class StockImage : BaseEntity
    {
        public const int StorageKeyMaxLength = 300;
        public const int TitleMaxLength = 100;
        public const int KeywordsMaxLength = 500;
        public const int GroupMaxLength = 50;
        private const string KeywordSeparator = ", ";
        private static readonly CultureInfo Turkish = CultureInfo.GetCultureInfo("tr-TR");

        /// <summary>CDN anahtarı, ör. <c>shared/stock/adana.webp</c>. Oluşturulduktan sonra değişmez (ürünler bu anahtarı tutar).</summary>
        public string StorageKey { get; private set; } = string.Empty;
        public string Title { get; private set; } = string.Empty;
        /// <summary>Arama kelimeleri, küçük harf, virgülle ayrılmış ("kebap, acılı, ızgara").</summary>
        public string Keywords { get; private set; } = string.Empty;
        /// <summary>İsteğe bağlı grup: "İçecek", "Ana yemek", "Tatlı"…</summary>
        public string? Group { get; private set; }
        public bool IsActive { get; private set; }
        public int SortOrder { get; private set; }

        protected StockImage() { }

        public static StockImage Create(string storageKey, string title, IEnumerable<string>? keywords, string? group, int sortOrder = 0)
        {
            StockImage image = new() { StorageKey = ValidateStorageKey(storageKey), IsActive = true };
            image.Update(title, keywords, group, sortOrder, isActive: true);
            return image;
        }

        public void Update(string title, IEnumerable<string>? keywords, string? group, int sortOrder, bool isActive)
        {
            string trimmedTitle = title?.Trim() ?? string.Empty;
            if (trimmedTitle.Length == 0)
                throw new DomainException("Görsel başlığı boş olamaz.");
            if (trimmedTitle.Length > TitleMaxLength)
                throw new DomainException($"Görsel başlığı en fazla {TitleMaxLength} karakter olabilir.");

            string joinedKeywords = string.Join(KeywordSeparator, (keywords ?? [])
                .Select(k => k?.Trim().ToLower(Turkish) ?? string.Empty)
                .Where(k => k.Length > 0)
                .Distinct());
            if (joinedKeywords.Length > KeywordsMaxLength)
                throw new DomainException($"Anahtar kelimeler toplamda en fazla {KeywordsMaxLength} karakter olabilir.");

            string? trimmedGroup = string.IsNullOrWhiteSpace(group) ? null : group.Trim();
            if (trimmedGroup is { Length: > GroupMaxLength })
                throw new DomainException($"Grup adı en fazla {GroupMaxLength} karakter olabilir.");

            Title = trimmedTitle;
            Keywords = joinedKeywords;
            Group = trimmedGroup;
            SortOrder = sortOrder;
            IsActive = isActive;
        }

        public IReadOnlyList<string> GetKeywords()
            => Keywords.Length == 0 ? [] : Keywords.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        // Anahtar yalnızca paylaşılan hazır görsel klasöründe olabilir; ".." ve ters bölü kabul edilmez ki
        // başka bir restoranın klasörünü gösteremesin.
        private static string ValidateStorageKey(string storageKey)
        {
            string key = storageKey?.Trim() ?? string.Empty;
            if (!key.StartsWith(StorageKeys.StockPrefix, StringComparison.Ordinal) || key.Length == StorageKeys.StockPrefix.Length)
                throw new DomainException($"Görsel anahtarı \"{StorageKeys.StockPrefix}\" klasöründe olmalı.");
            if (key.Contains("..", StringComparison.Ordinal) || key.Contains('\\') || key.Contains("//", StringComparison.Ordinal))
                throw new DomainException("Görsel anahtarı geçersiz.");
            if (key.Length > StorageKeyMaxLength)
                throw new DomainException($"Görsel anahtarı en fazla {StorageKeyMaxLength} karakter olabilir.");
            return key;
        }
    }
}
