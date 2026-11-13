using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.Property(o => o.PaidOnAccount)
            .HasPrecision(18, 2);

        // Hesaplanan değer (TotalPrice - PaidOnAccount); kolon değil.
        builder.Ignore(o => o.RemainingAmount);
    }
}
