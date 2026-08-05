using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Context;

public class RestaurantBillDbContext : DbContext
{
    private readonly ICurrentUserService _currentUser;

    public RestaurantBillDbContext(DbContextOptions<RestaurantBillDbContext> options, ICurrentUserService currentUser)
    : base(options)
    {
        _currentUser = currentUser;
    }

    public DbSet<User> Users { get; set; }
    public DbSet<UserBranch> UserBranches { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Company> Companies { get; set; }
    public DbSet<Branch> Branches { get; set; }
    public DbSet<Membership> Memberships { get; set; }
    public DbSet<Table> Tables { get; set; }
    public DbSet<Region> Regions { get; set; }
    public DbSet<CashRegister> CashRegisters { get; set; }
    public DbSet<CashTransaction> CashTransactions { get; set; }
    public DbSet<Reservation> Reservations { get; set; }
    public DbSet<VerificationCode> VerificationCodes { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<Payment> Payments { get; set; }

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
                    data.Entity.SetCreatedAt();
                    data.Entity.SetCreatedUser(_currentUser.UserId);
                    break;
                case EntityState.Modified:
                    data.Entity.SetUpdatedAt();
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
