using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class OrderRequestConfiguration : IEntityTypeConfiguration<OrderRequest>
{
    public void Configure(EntityTypeBuilder<OrderRequest> builder)
    {
        builder.Property(r => r.Note).HasMaxLength(500).HasDefaultValue(string.Empty);
        builder.HasIndex(r => new { r.TableId, r.Status });

        builder.HasOne(r => r.Table)
            .WithMany()
            .HasForeignKey(r => r.TableId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.Items)
            .WithOne(i => i.OrderRequest)
            .HasForeignKey(i => i.OrderRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(r => r.Items).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class OrderRequestItemConfiguration : IEntityTypeConfiguration<OrderRequestItem>
{
    public void Configure(EntityTypeBuilder<OrderRequestItem> builder)
    {
        builder.Property(i => i.Note).HasMaxLength(300).HasDefaultValue(string.Empty);

        // Ürün silinirse talep kalemi de gider; aksi halde ürün silme FK hatasına düşerdi.
        builder.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
