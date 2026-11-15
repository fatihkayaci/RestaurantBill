using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class ContactMessageConfiguration : IEntityTypeConfiguration<ContactMessage>
{
    public void Configure(EntityTypeBuilder<ContactMessage> builder)
    {
        builder.Property(m => m.Name).IsRequired().HasMaxLength(ContactMessage.NameMaxLength);
        builder.Property(m => m.Contact).IsRequired().HasMaxLength(ContactMessage.ContactMaxLength);
        builder.Property(m => m.Message).IsRequired().HasMaxLength(ContactMessage.MessageMaxLength);

        // Admin listesi: şubenin mesajları, en yenisi önce; okunmamış sayacı da aynı indeksten.
        builder.HasIndex(m => new { m.BranchId, m.IsRead, m.CreatedAt });

        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(m => m.BranchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
