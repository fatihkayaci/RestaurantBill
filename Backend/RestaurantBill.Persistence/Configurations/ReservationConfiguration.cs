using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Persistence.Configurations;

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.HasIndex(r => r.TableId);
        builder.HasIndex(r => new { r.Status, r.ReservationTime });
        builder.Property(r => r.PartySize).HasDefaultValue(0);
        // Eski satırlar migration'da rastgele anahtarla doldurulur (docs/paket-servis-migration-notes.md).
        builder.Property(r => r.AccessToken).IsRequired().HasMaxLength(64);
        builder.HasIndex(r => r.AccessToken).IsUnique();
        // Kısa kod tüm sistemde tekil (şirket kolonu rezervasyonda yok; sorgulama yine de slug'ın şirketiyle sınırlı).
        // Eski satırlar migration'da (AddReservationCode) çakışmasız rastgele kodla doldurulur.
        builder.Property(r => r.Code).IsRequired().HasMaxLength(ReservationCode.Length);
        builder.HasIndex(r => r.Code).IsUnique();

        builder.HasOne(r => r.Table)
            .WithMany()
            .HasForeignKey(r => r.TableId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
