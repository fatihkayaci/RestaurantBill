using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class UserRestaurantConfiguration : IEntityTypeConfiguration<UserRestaurant>
{
    public void Configure(EntityTypeBuilder<UserRestaurant> builder)
    {
        builder.HasIndex(ur => new { ur.RestaurantId, ur.UserName }).IsUnique();
        builder.HasIndex(ur => new { ur.UserId, ur.RestaurantId }).IsUnique();
    }
}
