using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.Property(oi => oi.TaxRate)
            .HasPrecision(5, 2)
            .HasDefaultValue(0m);

        builder.Property(oi => oi.Note)
            .HasMaxLength(300)
            .HasDefaultValue(string.Empty);
    }
}
