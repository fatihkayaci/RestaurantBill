using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class UserBranchConfiguration : IEntityTypeConfiguration<UserBranch>
{
    public void Configure(EntityTypeBuilder<UserBranch> builder)
    {
        builder.HasIndex(ur => new { ur.BranchId, ur.UserName }).IsUnique();
        builder.HasIndex(ur => new { ur.UserId, ur.BranchId }).IsUnique();
    }
}
