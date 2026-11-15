using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Seeds;

/// <summary>
/// Hazır görsel kataloğunu <c>Seeds/stock-images.json</c> dosyasından yükler (derlemeye gömülü kaynak). Açılışta çalışır,
/// tekrar çalışması zararsızdır: satırlar <c>storageKey</c> ile eşlenir; yoksa eklenir, varsa başlık, kelimeler, grup,
/// sıra ve aktiflik dosyadakiyle güncellenir. Dosyadan çıkarılan satır silinmez (ürünler onu kullanıyor olabilir);
/// kaldırmak için <c>"isActive": false</c> yazılır. Geçersiz satır atlanır, açılışı bozmaz.
/// Ayrıntı: docs/stock-images.md.
/// </summary>
public static class StockImageSeed
{
    public const string ResourceName = "RestaurantBill.Persistence.Seeds.stock-images.json";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    public sealed record SeedResult(int Added, int Updated, IReadOnlyList<string> Errors);

    public static async Task<SeedResult> SeedFromEmbeddedFileAsync(RestaurantBillDbContext context, CancellationToken cancellationToken = default)
    {
        await using Stream? stream = typeof(StockImageSeed).Assembly.GetManifestResourceStream(ResourceName);
        if (stream is null)
            return new SeedResult(0, 0, [$"Gömülü kaynak bulunamadı: {ResourceName}"]);

        using var reader = new StreamReader(stream);
        return await SeedAsync(context, await reader.ReadToEndAsync(cancellationToken), cancellationToken);
    }

    public static async Task<SeedResult> SeedAsync(RestaurantBillDbContext context, string json, CancellationToken cancellationToken = default)
    {
        List<Row>? rows;
        try
        {
            rows = JsonSerializer.Deserialize<List<Row>>(json, JsonOptions);
        }
        catch (JsonException ex)
        {
            return new SeedResult(0, 0, [$"stock-images.json okunamadı: {ex.Message}"]);
        }

        if (rows is null || rows.Count == 0)
            return new SeedResult(0, 0, []);

        Dictionary<string, StockImage> existing = await context.StockImages
            .ToDictionaryAsync(s => s.StorageKey, StringComparer.Ordinal, cancellationToken);

        int added = 0, updated = 0;
        var errors = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (Row row in rows)
        {
            string key = row.StorageKey?.Trim() ?? string.Empty;
            if (!seen.Add(key))
            {
                errors.Add($"{key}: dosyada iki kez var, ikincisi atlandı.");
                continue;
            }

            try
            {
                if (existing.TryGetValue(key, out StockImage? image))
                {
                    if (IsSame(image, row))
                        continue;
                    image.Update(row.Title ?? string.Empty, row.Keywords, row.Group, row.SortOrder, row.IsActive);
                    updated++;
                }
                else
                {
                    image = StockImage.Create(key, row.Title ?? string.Empty, row.Keywords, row.Group, row.SortOrder);
                    if (!row.IsActive)
                        image.Update(image.Title, image.GetKeywords(), image.Group, image.SortOrder, isActive: false);
                    context.StockImages.Add(image);
                    existing[key] = image;
                    added++;
                }
            }
            catch (DomainException ex)
            {
                errors.Add($"{(key.Length == 0 ? "(storageKey boş)" : key)}: {ex.Message}");
            }
        }

        if (added > 0 || updated > 0)
            await context.SaveChangesAsync(cancellationToken);

        return new SeedResult(added, updated, errors);
    }

    // Değişmemiş satır yeniden yazılmaz (UpdatedAt her açılışta değişmesin).
    private static bool IsSame(StockImage image, Row row)
    {
        StockImage probe = StockImage.Create(image.StorageKey, row.Title ?? string.Empty, row.Keywords, row.Group, row.SortOrder);
        return image.Title == probe.Title && image.Keywords == probe.Keywords && image.Group == probe.Group
            && image.SortOrder == row.SortOrder && image.IsActive == row.IsActive;
    }

    private sealed class Row
    {
        public string? StorageKey { get; set; }
        public string? Title { get; set; }
        public List<string>? Keywords { get; set; }
        public string? Group { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
