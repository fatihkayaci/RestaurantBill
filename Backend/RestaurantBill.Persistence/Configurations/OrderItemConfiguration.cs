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

        // ProductId menü satırları için null olabildiğinden açıkça yazılır; davranış öncekiyle aynı (Cascade).
        builder.HasOne(oi => oi.Product)
            .WithMany()
            .HasForeignKey(oi => oi.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(oi => oi.SetMenu)
            .WithMany()
            .HasForeignKey(oi => oi.SetMenuId)
            .OnDelete(DeleteBehavior.Restrict);

        // Menü satırı silinince içindeki ürün kalemleri de silinir.
        builder.HasOne(oi => oi.ParentOrderItem)
            .WithMany()
            .HasForeignKey(oi => oi.ParentOrderItemId)
            .OnDelete(DeleteBehavior.Cascade);

        // Satır ya ürün ya menüdür.
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_OrderItems_ProductOrSetMenu",
            "(\"ProductId\" IS NULL) <> (\"SetMenuId\" IS NULL)"));

        builder.Ignore(oi => oi.IsSetMenu);
        builder.Ignore(oi => oi.IsSetMenuComponent);
    }
}
