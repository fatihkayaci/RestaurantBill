using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Context;

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
    public DbSet<Category> Categories { get; set; }
    public DbSet<Restaurant> Restaurants { get; set; }
    public DbSet<Table> Tables { get; set; }
    public DbSet<User> Users { get; set; }
    // db configurations =>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RestaurantBillDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
    
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
}