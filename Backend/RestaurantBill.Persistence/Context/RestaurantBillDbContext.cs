using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Context;

public class RestaurantBillDbContext : IdentityDbContext<User, AppRole, int>
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
    public DbSet<CashRegister> CashRegisters { get; set; }
    public DbSet<CashTransaction> CashTransactions { get; set; }
    // db configurations =>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RestaurantBillDbContext).Assembly);
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