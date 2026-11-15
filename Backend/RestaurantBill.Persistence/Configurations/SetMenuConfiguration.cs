using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class SetMenuConfiguration : IEntityTypeConfiguration<SetMenu>
{
    public void Configure(EntityTypeBuilder<SetMenu> builder)
    {
        builder.Property(s => s.Name).IsRequired().HasMaxLength(SetMenu.NameMaxLength);
        builder.Property(s => s.Description).HasMaxLength(SetMenu.DescriptionMaxLength).HasDefaultValue(string.Empty);
        builder.Property(s => s.ImageUrl).HasDefaultValue(string.Empty);
        builder.Property(s => s.Price).HasPrecision(18, 2);
        builder.Property(s => s.DiscountValue).HasPrecision(18, 2);

        builder.HasOne(s => s.Branch)
            .WithMany()
            .HasForeignKey(s => s.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        // Gösterim kategorisi silinirse menü kategorisiz kalır.
        builder.HasOne(s => s.Category)
            .WithMany()
            .HasForeignKey(s => s.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(s => s.Slots)
            .WithOne(slot => slot.SetMenu)
            .HasForeignKey(slot => slot.SetMenuId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.BranchId);
    }
}

public class SetMenuSlotConfiguration : IEntityTypeConfiguration<SetMenuSlot>
{
    public void Configure(EntityTypeBuilder<SetMenuSlot> builder)
    {
        builder.Property(s => s.Name).IsRequired().HasMaxLength(SetMenuSlot.NameMaxLength);
        builder.Ignore(s => s.IsFixed);

        // Bölümün kategorisi silinirse bölüm kalır, yalnızca kategori bağı kopar.
        builder.HasOne(s => s.Category)
            .WithMany()
            .HasForeignKey(s => s.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(s => s.Options)
            .WithOne(o => o.SetMenuSlot)
            .HasForeignKey(o => o.SetMenuSlotId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SetMenuSlotOptionConfiguration : IEntityTypeConfiguration<SetMenuSlotOption>
{
    public void Configure(EntityTypeBuilder<SetMenuSlotOption> builder)
    {
        builder.Property(o => o.Surcharge).HasPrecision(18, 2);
        builder.Property(o => o.DiscountValue).HasPrecision(18, 2);

        // Menüde kullanılan ürün silinemez; önce menüden çıkarılır (DeleteProduct bunu kullanıcıya söyler).
        builder.HasOne(o => o.Product)
            .WithMany()
            .HasForeignKey(o => o.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
