using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain;

namespace RestaurantBill.Infrastructure.Context;

public class RestaurantBillDbContext : DbContext
{
    public RestaurantBillDbContext(DbContextOptions<RestaurantBillDbContext> options) 
    : base(options)
    {
    }
    // db tables =>
    public DbSet<Product> Products { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var datas = ChangeTracker.Entries<BaseEntity>();

        foreach (var data in datas)
        {
            switch (data.State)
            {
                case EntityState.Added:
                    data.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    data.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
    
    // db configuration =>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Product Tablosu Kuralları
        modelBuilder.Entity<Product>(entity => 
        {
            // Name alanı zorunlu ve max 100 karakter olsun
            entity.Property(p => p.Name)
                .IsRequired()
                .HasMaxLength(100);

            // Fiyat alanı 18 basamaklı, virgülden sonra 2 hane olsun (Para birimi standardı)
            entity.Property(p => p.Price)
                .HasPrecision(18, 2); 
        });

        // Order Tablosu Kuralları
        modelBuilder.Entity<Order>(entity =>
        {
            entity.Property(o => o.TotalPrice)
                .HasPrecision(18, 2);
        });

        base.OnModelCreating(modelBuilder);
    }
}
