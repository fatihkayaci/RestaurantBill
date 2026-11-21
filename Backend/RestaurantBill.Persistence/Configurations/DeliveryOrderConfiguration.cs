using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Persistence.Configurations;

public class DeliveryOrderConfiguration : IEntityTypeConfiguration<DeliveryOrder>
{
    public void Configure(EntityTypeBuilder<DeliveryOrder> builder)
    {
        builder.Property(d => d.AccessToken).IsRequired().HasMaxLength(64);
        builder.Property(d => d.CustomerName).IsRequired().HasMaxLength(DeliveryOrder.NameMaxLength);
        builder.Property(d => d.CustomerPhone).IsRequired().HasMaxLength(TurkishPhone.NormalizedLength);
        builder.Property(d => d.Address).IsRequired().HasMaxLength(DeliveryOrder.AddressMaxLength);
        builder.Property(d => d.AddressDirections).HasMaxLength(DeliveryOrder.DirectionsMaxLength);
        builder.Property(d => d.Note).HasMaxLength(DeliveryOrder.NoteMaxLength);
        builder.Property(d => d.ZoneName).HasMaxLength(DeliveryZone.NameMaxLength);
        builder.Property(d => d.RejectReason).HasMaxLength(DeliveryOrder.ReasonMaxLength);
        builder.Property(d => d.CancelReason).HasMaxLength(DeliveryOrder.ReasonMaxLength);
        builder.Property(d => d.ClientIp).HasMaxLength(64);

        builder.Property(d => d.Subtotal).HasPrecision(18, 2);
        builder.Property(d => d.DeliveryFee).HasPrecision(18, 2);
        builder.Property(d => d.Total).HasPrecision(18, 2);
        builder.Property(d => d.CollectedAmount).HasPrecision(18, 2);
        builder.Property(d => d.HandoverCountedCash).HasPrecision(18, 2);
        builder.Property(d => d.HandoverCashDifference).HasPrecision(18, 2);

        builder.Ignore(d => d.IsOpen);
        builder.Ignore(d => d.IsSettled);
        builder.Ignore(d => d.IsPickup);

        // Adrese teslim (Delivery) ya da gel al (Takeaway); bu sütundan önceki siparişlerin hepsi adrese teslimdir.
        builder.Property(d => d.OrderType).HasDefaultValue(RestaurantBill.Domain.Enums.OrderType.Delivery);

        builder.HasIndex(d => d.AccessToken).IsUnique();
        builder.HasIndex(d => new { d.BranchId, d.Number }).IsUnique();
        builder.HasIndex(d => new { d.BranchId, d.ClientRequestId }).IsUnique();
        builder.HasIndex(d => new { d.BranchId, d.Status });
        builder.HasIndex(d => new { d.BranchId, d.CustomerPhone, d.CreatedAt });
        builder.HasIndex(d => new { d.CourierUserId, d.Status });
        builder.HasIndex(d => d.OrderId);

        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(d => d.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        // Bölge silinse de sipariş adı ve ücretiyle kalır.
        builder.HasOne<DeliveryZone>()
            .WithMany()
            .HasForeignKey(d => d.DeliveryZoneId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(d => d.Order)
            .WithMany()
            .HasForeignKey(d => d.OrderId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(d => d.Lines)
            .WithOne(l => l.DeliveryOrder)
            .HasForeignKey(l => l.DeliveryOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(d => d.Lines).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class DeliveryOrderLineConfiguration : IEntityTypeConfiguration<DeliveryOrderLine>
{
    public void Configure(EntityTypeBuilder<DeliveryOrderLine> builder)
    {
        builder.Property(l => l.NameSnapshot).IsRequired().HasMaxLength(100);
        builder.Property(l => l.Note).HasMaxLength(DeliveryOrderLine.NoteMaxLength);
        builder.Property(l => l.SelectionsJson).HasColumnType("jsonb");
        builder.Property(l => l.UnitPrice).HasPrecision(18, 2);
        builder.Property(l => l.TaxRate).HasPrecision(5, 2);

        // Ürün ya da menü silinse de satır adı ve fiyatıyla kalır.
        builder.HasOne(l => l.Product)
            .WithMany()
            .HasForeignKey(l => l.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(l => l.SetMenu)
            .WithMany()
            .HasForeignKey(l => l.SetMenuId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class DeliveryZoneConfiguration : IEntityTypeConfiguration<DeliveryZone>
{
    public void Configure(EntityTypeBuilder<DeliveryZone> builder)
    {
        builder.Property(z => z.Name).IsRequired().HasMaxLength(DeliveryZone.NameMaxLength);
        builder.Property(z => z.Fee).HasPrecision(18, 2);
        builder.Property(z => z.MinOrderAmount).HasPrecision(18, 2);

        builder.HasIndex(z => new { z.BranchId, z.SortOrder });

        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(z => z.BranchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class BlockedPhoneConfiguration : IEntityTypeConfiguration<BlockedPhone>
{
    public void Configure(EntityTypeBuilder<BlockedPhone> builder)
    {
        builder.Property(b => b.Phone).IsRequired().HasMaxLength(TurkishPhone.NormalizedLength);
        builder.Property(b => b.Reason).HasMaxLength(BlockedPhone.ReasonMaxLength);

        // Silinen engel (IsDeleted) aynı numaranın yeniden engellenmesini engellemesin.
        builder.HasIndex(b => new { b.BranchId, b.Phone }).IsUnique().HasFilter("\"IsDeleted\" = false");

        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(b => b.BranchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class CustomerPhoneVerificationConfiguration : IEntityTypeConfiguration<CustomerPhoneVerification>
{
    public void Configure(EntityTypeBuilder<CustomerPhoneVerification> builder)
    {
        builder.Property(v => v.Phone).IsRequired().HasMaxLength(TurkishPhone.NormalizedLength);
        builder.Property(v => v.CodeHash).IsRequired().HasMaxLength(128);
        builder.Property(v => v.VerificationTokenHash).HasMaxLength(128);

        builder.HasIndex(v => new { v.BranchId, v.Phone, v.CreatedAt });
        builder.HasIndex(v => v.VerificationTokenHash);

        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(v => v.BranchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
