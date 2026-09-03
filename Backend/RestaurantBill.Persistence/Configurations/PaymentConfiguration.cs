using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.Property(p => p.TotalAmount)
            .HasPrecision(18, 2);

        builder.Property(p => p.Matrah)
            .HasPrecision(18, 2);

        builder.Property(p => p.TaxAmount)
            .HasPrecision(18, 2);

        builder.Property(p => p.DiscountAmount)
            .HasPrecision(18, 2);

        builder.Property(p => p.DiscountPercent)
            .HasPrecision(5, 2);
    }
}
