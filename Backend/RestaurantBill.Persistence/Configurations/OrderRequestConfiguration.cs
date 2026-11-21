using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Persistence.Configurations;

public class OrderRequestConfiguration : IEntityTypeConfiguration<OrderRequest>
{
    public void Configure(EntityTypeBuilder<OrderRequest> builder)
    {
        builder.Property(r => r.Note).HasMaxLength(500).HasDefaultValue(string.Empty);
        builder.Property(r => r.RejectReason).HasMaxLength(OrderRequest.RejectReasonMaxLength).HasDefaultValue(string.Empty);
        builder.Property(r => r.Kind).HasDefaultValue(OrderRequestKind.TableQr);
        // SHA-256 özeti (64 hex).
        builder.Property(r => r.DeviceTokenHash).HasMaxLength(64);
        builder.HasIndex(r => new { r.TableId, r.Status });
        builder.HasIndex(r => new { r.ReservationId, r.Status });

        // Rezervasyon silinirse ön siparişi de gider.
        builder.HasOne(r => r.Reservation)
            .WithMany()
            .HasForeignKey(r => r.ReservationId)
            .OnDelete(DeleteBehavior.Cascade);

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
        builder.Property(i => i.UnitPrice).HasPrecision(18, 2);

        // Ürün silinirse talep kalemi de gider; aksi halde ürün silme FK hatasına düşerdi.
        builder.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Menü kalemi: menü silinirse (ürün gibi) talep kalemi de gider.
        builder.HasOne(i => i.SetMenu)
            .WithMany()
            .HasForeignKey(i => i.SetMenuId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(i => i.SelectionsJson).HasColumnType("jsonb").HasDefaultValue("{}");
    }
}
