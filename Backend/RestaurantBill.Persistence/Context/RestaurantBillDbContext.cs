using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Context;

public class RestaurantBillDbContext : DbContext, IAppDbContext
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
    public DbSet<PaymentLineItem> PaymentLineItems { get; set; }
    public DbSet<Shift> Shifts { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RestaurantBillDbContext).Assembly);

        // Para ve masa durumu taşıyan satırlarda Postgres'in xmin sistem kolonu concurrency token olarak kullanılır:
        // aynı kaydı eşzamanlı güncelleyen iki istekten ikincisi sessizce ezmek yerine DbUpdateConcurrencyException alır.
        foreach (Type entityType in new[] { typeof(CashRegister), typeof(Order), typeof(Table), typeof(Shift) })
            modelBuilder.Entity(entityType).Property<uint>("xmin").IsRowVersion();
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
