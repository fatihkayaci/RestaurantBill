using Microsoft.EntityFrameworkCore;
using RestaurantBill.Core;

namespace RestaurantBill.Infrastructure.Context;

public class RestaurantBillDbContext : DbContext
{
    public RestaurantBillDbContext(DbContextOptions<RestaurantBillDbContext> options) 
    : base(options)
    {
    }
    public DbSet<Category> Categories {get; set;}
    public DbSet<Order> Orders {get; set;}
    public DbSet<OrderItem> OrderItems {get; set;}
    public DbSet<Product> Products {get; set;}
    public DbSet<Table> Tables {get; set;}
    public DbSet<User> Users {get; set;}
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>()
            .Property(p => p.Price)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<OrderItem>()
            .Property(o => o.Price)
            .HasColumnType("decimal(18,2)");
            
        base.OnModelCreating(modelBuilder);
    }
}
