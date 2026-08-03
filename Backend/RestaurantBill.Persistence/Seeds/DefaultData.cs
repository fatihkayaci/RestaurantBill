using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Seeds;

public static class DefaultData
{
    public static async Task SeedAsync(RestaurantBillDbContext context, IPasswordHasher<User> passwordHasher)
    {
        await SeedDemoDataAsync(context, passwordHasher);
    }

    private static async Task SeedDemoDataAsync(RestaurantBillDbContext context, IPasswordHasher<User> passwordHasher)
    {
        if (await context.Companies.AnyAsync())
            return;

        // Owner (email/password login, no username — sees the Owner portal)
        User ownerUser = User.Create("Restoran Sahibi", "owner@demo.com", "05000000000");
        ownerUser.SetPasswordHash(passwordHasher.HashPassword(ownerUser, "Owner123*"));
        await context.Users.AddAsync(ownerUser);
        await context.SaveChangesAsync();

        Company company = Company.Create("Demo Restoran", ownerUser);
        company.Slug = "demo";
        await context.Companies.AddAsync(company);
        await context.SaveChangesAsync();

        Branch branch = Branch.Create(
            company.Id,
            "Merkez Şube",
            "Şube Yöneticisi",
            "0212 000 00 00",
            "info@demorestoran.com",
            "İstanbul",
            "Kadıköy",
            string.Empty);
        await context.Branches.AddAsync(branch);
        await context.SaveChangesAsync();

        Membership membership = Membership.Create(branch.Id, MembershipPlanType.Free, DateTime.UtcNow, DateTime.UtcNow.AddDays(14));
        await context.Memberships.AddAsync(membership);
        await context.SaveChangesAsync();

        // Staff (username/password login, scoped to the branch)
        var staffUsers = new[]
        {
            new { FullName = "Şube Yöneticisi", UserName = "admin",   Email = "admin@demo.com",   Phone = "05000000001", UserCode = "0001", Password = "Admin123*",   Role = UserRole.Admin   },
            new { FullName = "Demo Garson",     UserName = "waiter",  Email = "waiter@demo.com",  Phone = "05000000002", UserCode = "1001", Password = "Waiter123*",  Role = UserRole.Waiter  },
            new { FullName = "Demo Mutfak",     UserName = "kitchen", Email = "kitchen@demo.com", Phone = "05000000003", UserCode = "1002", Password = "Kitchen123*", Role = UserRole.Kitchen },
            new { FullName = "Demo Kasiyer",    UserName = "cashier", Email = "cashier@demo.com", Phone = "05000000004", UserCode = "1003", Password = "Cashier123*", Role = UserRole.Cashier },
        };

        foreach (var s in staffUsers)
        {
            User user = User.Create(s.FullName, s.Email, s.Phone);
            user.SetPasswordHash(passwordHasher.HashPassword(user, s.Password));
            await context.Users.AddAsync(user);
            await context.SaveChangesAsync();

            UserBranch userBranch = UserBranch.Create(user, branch, s.UserName, s.UserCode, s.Role);
            await context.UserBranches.AddAsync(userBranch);
            await context.SaveChangesAsync();
        }

        // Regions
        Region salon = Region.Create("Salon", branch.Id);
        Region teras = Region.Create("Teras", branch.Id);
        await context.Regions.AddRangeAsync(salon, teras);
        await context.SaveChangesAsync();

        // Tables
        List<Table> tables = Enumerable.Range(1, 8)
            .Select(i => Table.Create($"Masa {i}", string.Empty, i <= 6 ? salon.Id : teras.Id))
            .ToList();
        await context.Tables.AddRangeAsync(tables);
        await context.SaveChangesAsync();

        // Categories
        Category starters = Category.Create("Başlangıçlar", branch.Id);
        Category mains = Category.Create("Ana Yemekler", branch.Id);
        Category drinks = Category.Create("İçecekler", branch.Id);
        await context.Categories.AddRangeAsync(starters, mains, drinks);
        await context.SaveChangesAsync();

        // Products
        Product[] products =
        [
            Product.Create("Mevsim Salata", 85m, string.Empty, starters.Id),
            Product.Create("Mercimek Çorbası", 75m, string.Empty, starters.Id),
            Product.Create("Humus", 90m, string.Empty, starters.Id),
            Product.Create("Beyti Sarma", 220m, string.Empty, mains.Id),
            Product.Create("Adana Kebap", 240m, string.Empty, mains.Id),
            Product.Create("İzgara Köfte", 200m, string.Empty, mains.Id),
            Product.Create("Tavuk Şiş", 180m, string.Empty, mains.Id),
            Product.Create("Karışık Pide", 160m, string.Empty, mains.Id),
            Product.Create("Su (500ml)", 20m, string.Empty, drinks.Id),
            Product.Create("Ayran", 35m, string.Empty, drinks.Id),
            Product.Create("Kola", 55m, string.Empty, drinks.Id),
            Product.Create("Türk Kahvesi", 65m, string.Empty, drinks.Id),
        ];
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        // Cash Registers
        CashRegister[] cashRegisters =
        [
            CashRegister.Create("Nakit Kasa", 0m, branch.Id),
            CashRegister.Create("Kart Kasa", 0m, branch.Id),
        ];
        await context.CashRegisters.AddRangeAsync(cashRegisters);
        await context.SaveChangesAsync();
    }
}
