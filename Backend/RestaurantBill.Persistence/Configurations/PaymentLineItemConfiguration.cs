using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class PaymentLineItemConfiguration : IEntityTypeConfiguration<PaymentLineItem>
{
    public void Configure(EntityTypeBuilder<PaymentLineItem> builder)
    {
        builder.Property(l => l.ProductName).HasMaxLength(200);
        builder.Property(l => l.CategoryName).HasMaxLength(200);

        builder.Property(l => l.UnitPrice).HasPrecision(18, 2);
        builder.Property(l => l.TaxRate).HasPrecision(5, 2);

        builder.HasOne(l => l.Payment)
            .WithMany()
            .HasForeignKey(l => l.PaymentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(l => l.ProductId);
        builder.HasIndex(l => l.PaymentId);
    }
}
