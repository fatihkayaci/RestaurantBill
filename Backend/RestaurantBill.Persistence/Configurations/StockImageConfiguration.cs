using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class StockImageConfiguration : IEntityTypeConfiguration<StockImage>
{
    public void Configure(EntityTypeBuilder<StockImage> builder)
    {
        builder.Property(s => s.StorageKey).IsRequired().HasMaxLength(StockImage.StorageKeyMaxLength);
        builder.Property(s => s.Title).IsRequired().HasMaxLength(StockImage.TitleMaxLength);
        builder.Property(s => s.Keywords).IsRequired().HasMaxLength(StockImage.KeywordsMaxLength);
        builder.Property(s => s.Group).HasMaxLength(StockImage.GroupMaxLength);

        // Seed dosyası satırları anahtara göre eşler; aynı dosya iki kez kataloğa girmesin.
        builder.HasIndex(s => s.StorageKey).IsUnique();
        builder.HasIndex(s => new { s.IsActive, s.SortOrder });
    }
}
