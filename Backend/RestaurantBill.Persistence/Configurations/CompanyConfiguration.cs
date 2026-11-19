using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> builder)
    {
        // Restoran sitesi şirket genelidir: yayındaki hâl ve taslak ayrı jsonb sütunlarında (SiteDraftJson şekli); null = yok.
        // Müşteri sitesi yalnız Site'ı okur; SiteDraft düzenleyicinindir.
        builder.Property(c => c.Site)
            .HasColumnType("jsonb")
            .HasConversion(
                v => SiteDraftJson.Serialize(v!),
                s => SiteDraftJson.Deserialize(s),
                SnapshotComparer());

        builder.Property(c => c.SiteDraft)
            .HasColumnType("jsonb")
            .HasConversion(
                v => SiteDraftJson.Serialize(v!),
                s => SiteDraftJson.Deserialize(s),
                SnapshotComparer());

        builder.Property(c => c.SiteDraftVersion)
            .HasDefaultValue(0);
    }

    private static ValueComparer<SiteSnapshot?> SnapshotComparer() => new(
        (a, b) => SiteDraftJson.SerializeOrNull(a) == SiteDraftJson.SerializeOrNull(b),
        v => (SiteDraftJson.SerializeOrNull(v) ?? string.Empty).GetHashCode(),
        v => v);
}
