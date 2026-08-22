using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<UserBranch> UserBranches { get; }
    DbSet<Product> Products { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<Category> Categories { get; }
    DbSet<Company> Companies { get; }
    DbSet<Branch> Branches { get; }
    DbSet<Membership> Memberships { get; }
    DbSet<Table> Tables { get; }
    DbSet<Region> Regions { get; }
    DbSet<CashRegister> CashRegisters { get; }
    DbSet<CashTransaction> CashTransactions { get; }
    DbSet<Reservation> Reservations { get; }
    DbSet<VerificationCode> VerificationCodes { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Shift> Shifts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
