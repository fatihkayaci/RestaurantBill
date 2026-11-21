using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.Property(o => o.PaidOnAccount)
            .HasPrecision(18, 2);

        builder.Property(o => o.DeliveryFee)
            .HasPrecision(18, 2);

        builder.Property(o => o.OrderType)
            .HasDefaultValue(OrderType.DineIn);

        // Masa silinince siparişleri de gider (eski davranış); paket siparişin masası yoktur.
        builder.HasOne(o => o.Table)
            .WithMany()
            .HasForeignKey(o => o.TableId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        // Şube filtreleri masa → bölge yerine doğrudan buna bakar. Şube silinince (bölgesi kalmamışsa) paket siparişleri
        // de gider; masa siparişleri zaten bölge → masa üzerinden siliniyordu.
        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(o => o.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(o => new { o.BranchId, o.Status });

        // SHA-256 özeti (64 hex).
        builder.Property(o => o.QrOwnerTokenHash).HasMaxLength(64);

        // Hesaplanan değer (TotalPrice - PaidOnAccount); kolon değil.
        builder.Ignore(o => o.RemainingAmount);
        builder.Ignore(o => o.HasTable);
        builder.Ignore(o => o.IsPackageOrder);
    }
}
