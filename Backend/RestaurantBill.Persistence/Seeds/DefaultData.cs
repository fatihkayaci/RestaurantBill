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
        var demoUsers = new[]
        {
            new { FullName = "System Administrator", UserName = "admin",   Email = "admin@demo.com",   Phone = "05000000000", UserCode = "0000", Password = "Admin123*",   Role = UserRole.Admin   },
            new { FullName = "Demo Waiter",          UserName = "waiter",  Email = "waiter@demo.com",  Phone = "05000000001", UserCode = "1001", Password = "Waiter123*",  Role = UserRole.Waiter  },
            new { FullName = "Demo Kitchen",         UserName = "kitchen", Email = "kitchen@demo.com", Phone = "05000000002", UserCode = "1002", Password = "Kitchen123*", Role = UserRole.Kitchen },
            new { FullName = "Demo Cashier",         UserName = "cashier", Email = "cashier@demo.com", Phone = "05000000003", UserCode = "1003", Password = "Cashier123*", Role = UserRole.Cashier },
        };

        // Company + Branch (owner = admin demo user)
        if (!await context.Companies.AnyAsync())
        {
            var adminData = demoUsers[0];
            User adminUser = User.Create(adminData.FullName, adminData.Email, adminData.Phone);
            adminUser.SetPasswordHash(passwordHasher.HashPassword(adminUser, adminData.Password));
            await context.Users.AddAsync(adminUser);
            await context.SaveChangesAsync();

            Company company = Company.Create("Demo Restaurant", adminUser.Id);
            company.Slug = "demo";
            await context.Companies.AddAsync(company);
            await context.SaveChangesAsync();

            Branch branch = Branch.Create("Demo Restaurant");
            branch.Update("Demo Restaurant", string.Empty, "0212 000 00 00", "info@demorestaurant.com", "Istanbul", "Kadikoy", string.Empty);
            await context.Branches.AddAsync(branch);
            await context.SaveChangesAsync();

            UserBranch adminUserBranch = UserBranch.Create(adminUser, branch, adminData.UserName, adminData.UserCode, adminData.Role);
            await context.UserBranches.AddAsync(adminUserBranch);
            await context.SaveChangesAsync();
        }

        Branch demoRestaurant = await context.Branches.FirstAsync();

        // Remaining users
        if (await context.Users.CountAsync() < demoUsers.Length)
        {
            foreach (var u in demoUsers.Skip(1))
            {
                User user = User.Create(u.FullName, u.Email, u.Phone);
                user.SetPasswordHash(passwordHasher.HashPassword(user, u.Password));
                await context.Users.AddAsync(user);
                await context.SaveChangesAsync();

                UserBranch userBranch = UserBranch.Create(user, demoRestaurant, u.UserName, u.UserCode, u.Role);
                await context.UserBranches.AddAsync(userBranch);
                await context.SaveChangesAsync();
            }
        }

        // Categories
        if (!await context.Categories.AnyAsync())
        {
            Category[] categories = new[]
            {
                Category.Create("Starters",    demoRestaurant.Id),
                Category.Create("Main Course", demoRestaurant.Id),
                Category.Create("Beverages",   demoRestaurant.Id),
            };
            await context.Categories.AddRangeAsync(categories);
            await context.SaveChangesAsync();
        }

        // Products
        if (!await context.Products.AnyAsync())
        {
            Category starter = await context.Categories.FirstAsync(c => c.Name == "Starters");
            Category main    = await context.Categories.FirstAsync(c => c.Name == "Main Course");
            Category drink   = await context.Categories.FirstAsync(c => c.Name == "Beverages");

            Product[] products = new[]
            {
                Product.Create("Garden Salad",      85m,  string.Empty, starter.Id),
                Product.Create("Lentil Soup",       75m,  string.Empty, starter.Id),
                Product.Create("Hummus",            90m,  string.Empty, starter.Id),
                Product.Create("Beyti Wrap",        220m, string.Empty, main.Id),
                Product.Create("Adana Kebab",       240m, string.Empty, main.Id),
                Product.Create("Grilled Meatballs", 200m, string.Empty, main.Id),
                Product.Create("Chicken Skewer",    180m, string.Empty, main.Id),
                Product.Create("Mixed Pide",        160m, string.Empty, main.Id),
                Product.Create("Water (500ml)",     20m,  string.Empty, drink.Id),
                Product.Create("Ayran",             35m,  string.Empty, drink.Id),
                Product.Create("Cola",              55m,  string.Empty, drink.Id),
                Product.Create("Turkish Coffee",    65m,  string.Empty, drink.Id),
            };
            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();
        }

        // Cash Registers
        if (!await context.CashRegisters.AnyAsync())
        {
            CashRegister[] cashRegisters = new[]
            {
                CashRegister.Create("Cash", 0m, demoRestaurant.Id),
                CashRegister.Create("Card", 0m, demoRestaurant.Id),
            };
            await context.CashRegisters.AddRangeAsync(cashRegisters);
            await context.SaveChangesAsync();
        }

        // Regions
        if (!await context.Regions.AnyAsync())
        {
            Region[] regions = new[]
            {
                Region.Create("Indoor", demoRestaurant.Id),
                Region.Create("Terrace", demoRestaurant.Id),
            };
            await context.Regions.AddRangeAsync(regions);
            await context.SaveChangesAsync();
        }

        // Tables
        if (!await context.Tables.AnyAsync())
        {
            Region indoor = await context.Regions.FirstAsync(r => r.Name == "Indoor");

            List<Table> tables = Enumerable.Range(1, 8)
                .Select(i => Table.Create($"Table {i}", string.Empty, demoRestaurant.Id))
                .ToList();
            tables.ForEach(t => t.AssignRegion(indoor.Id));
            await context.Tables.AddRangeAsync(tables);
            await context.SaveChangesAsync();
        }
    }
}
