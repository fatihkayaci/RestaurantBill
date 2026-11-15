using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.StockImages;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.StockImages;

/// <summary>Hazır görsel kütüphanesinde arama. Boş sorgu varsayılan listeyi (sıra, başlık) döner.</summary>
public class SearchStockImagesQuery : IRequest<Result<List<StockImageDto>>>
{
    public string? Q { get; set; }
}

public class SearchStockImagesQueryHandler(IAppDbContext db, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<SearchStockImagesQuery, Result<List<StockImageDto>>>
{
    public async Task<Result<List<StockImageDto>>> Handle(SearchStockImagesQuery request, CancellationToken cancellationToken)
    {
        // Katalog küçük ve ortak (birkaç yüz satır): aktiflerin hepsi okunur, Türkçe harf duyarsız sıralama bellekte yapılır.
        List<StockImage> images = await db.StockImages.AsNoTracking()
            .Where(s => s.IsActive && !s.IsDeleted)
            .ToListAsync(cancellationToken);

        string cdnBaseUrl = storageOptions.Value.CdnBaseUrl.TrimEnd('/');
        List<StockImageDto> result = StockImageSearch.Rank(images, request.Q)
            .Select(s => new StockImageDto { Id = s.Id, Title = s.Title, Group = s.Group, Url = $"{cdnBaseUrl}/{s.StorageKey}" })
            .ToList();

        return Result<List<StockImageDto>>.Success(result);
    }
}

/// <summary>
/// Sıralama: başlık birebir &gt; anahtar kelime birebir &gt; başlık/kelime başı &gt; içinde geçiyor. Çok kelimeli sorguda
/// (seçici ürün adıyla açılır: "Adana Kebap") tüm ifade bir yerde geçmiyorsa kelime kelime eşleşenler, eşleşen kelime
/// sayısına göre sonra gelir. Eşitlikte SortOrder, sonra başlık. En çok <see cref="MaxResults"/> sonuç.
/// </summary>
public static class StockImageSearch
{
    public const int MaxResults = 48;
    public const int MaxQueryLength = 100;

    private const int TitleExact = 0;
    private const int KeywordExact = 1;
    private const int Prefix = 2;
    private const int Contains = 3;

    public static List<StockImage> Rank(IEnumerable<StockImage> images, string? query)
    {
        string q = SearchText.Fold(query is { Length: > MaxQueryLength } ? query[..MaxQueryLength] : query);

        if (q.Length == 0)
        {
            return images
                .OrderBy(s => s.SortOrder).ThenBy(s => s.Group ?? string.Empty).ThenBy(s => s.Title)
                .Take(MaxResults)
                .ToList();
        }

        string[] tokens = q.Split(' ').Where(t => t.Length >= 2).Distinct().ToArray();

        return images
            .Select(image => (Image: image, Rank: RankOf(new Folded(image), q, tokens)))
            .Where(x => x.Rank is not null)
            .OrderBy(x => x.Rank!.Value.Group)
            .ThenBy(x => x.Rank!.Value.Order)
            .ThenBy(x => x.Rank!.Value.Tier)
            .ThenBy(x => x.Image.SortOrder)
            .ThenBy(x => x.Image.Title)
            .Take(MaxResults)
            .Select(x => x.Image)
            .ToList();
    }

    // Group 0: tüm ifade eşleşti (Order = katman). Group 1: kelime kelime eşleşti (Order = −eşleşen kelime, Tier = en iyi katman).
    private static (int Group, int Order, int Tier)? RankOf(Folded image, string q, string[] tokens)
    {
        int? phrase = TierOf(image, q);
        if (phrase is not null)
            return (0, phrase.Value, 0);

        if (tokens.Length < 2)
            return null;

        int matched = 0;
        int best = int.MaxValue;
        foreach (string token in tokens)
        {
            int? tier = TierOf(image, token);
            if (tier is null) continue;
            matched++;
            best = Math.Min(best, tier.Value);
        }

        return matched == 0 ? null : (1, -matched, best);
    }

    private static int? TierOf(Folded image, string term)
    {
        if (image.Title == term) return TitleExact;
        if (image.Keywords.Contains(term)) return KeywordExact;
        if (image.Words.Any(w => w.StartsWith(term, StringComparison.Ordinal))) return Prefix;
        if (image.All.Contains(term, StringComparison.Ordinal)) return Contains;
        return null;
    }

    private sealed class Folded
    {
        public string Title { get; }
        public string[] Keywords { get; }
        /// <summary>Başlık, kelimeler ve bunların içindeki tek tek sözcükler (kelime başı eşleşmesi için).</summary>
        public string[] Words { get; }
        public string All { get; }

        public Folded(StockImage image)
        {
            Title = SearchText.Fold(image.Title);
            Keywords = image.GetKeywords().Select(SearchText.Fold).Where(k => k.Length > 0).ToArray();
            string[] phrases = [Title, .. Keywords];
            Words = phrases.Concat(phrases.SelectMany(p => p.Split(' '))).Distinct().ToArray();
            All = string.Join(" | ", phrases);
        }
    }
}
