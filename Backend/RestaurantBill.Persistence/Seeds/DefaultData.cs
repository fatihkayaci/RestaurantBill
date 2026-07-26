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
        // Restaurant
        if (!await context.Restaurants.AnyAsync())
        {
            Restaurant restaurant = Restaurant.Create();
            restaurant.Update("Demo Restaurant", "0212 000 00 00", "info@demorestaurant.com", "Istanbul", "Kadikoy");
            restaurant.AssignSlug("demo");
            await context.Restaurants.AddAsync(restaurant);
            await context.SaveChangesAsync();
        }

        Restaurant demoRestaurant = await context.Restaurants.FirstAsync();

        // Users
        if (!await context.Users.AnyAsync())
        {
            var demoUsers = new[]
            {
                new { FullName = "System Administrator", UserName = "admin",   Email = "admin@demo.com",   Phone = "05000000000", UserCode = "0000", Password = "Admin123*",   Role = UserRole.Admin   },
                new { FullName = "Demo Waiter",          UserName = "waiter",  Email = "waiter@demo.com",  Phone = "05000000001", UserCode = "1001", Password = "Waiter123*",  Role = UserRole.Waiter  },
                new { FullName = "Demo Kitchen",         UserName = "kitchen", Email = "kitchen@demo.com", Phone = "05000000002", UserCode = "1002", Password = "Kitchen123*", Role = UserRole.Kitchen },
                new { FullName = "Demo Cashier",         UserName = "cashier", Email = "cashier@demo.com", Phone = "05000000003", UserCode = "1003", Password = "Cashier123*", Role = UserRole.Cashier },
            };

            foreach (var u in demoUsers)
            {
                User user = User.Create(u.FullName, u.Email, u.Phone);
                user.SetPasswordHash(passwordHasher.HashPassword(user, u.Password));
                await context.Users.AddAsync(user);
                await context.SaveChangesAsync();

                UserRestaurant userRestaurant = UserRestaurant.Create(user, demoRestaurant, u.UserName, u.UserCode, u.Role);
                await context.UserRestaurants.AddAsync(userRestaurant);
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
                Product.Create("Garden Salad",      85m,  true, string.Empty, starter.Id),
                Product.Create("Lentil Soup",       75m,  true, string.Empty, starter.Id),
                Product.Create("Hummus",            90m,  true, string.Empty, starter.Id),
                Product.Create("Beyti Wrap",        220m, true, string.Empty, main.Id),
                Product.Create("Adana Kebab",       240m, true, string.Empty, main.Id),
                Product.Create("Grilled Meatballs", 200m, true, string.Empty, main.Id),
                Product.Create("Chicken Skewer",    180m, true, string.Empty, main.Id),
                Product.Create("Mixed Pide",        160m, true, string.Empty, main.Id),
                Product.Create("Water (500ml)",     20m,  true, string.Empty, drink.Id),
                Product.Create("Ayran",             35m,  true, string.Empty, drink.Id),
                Product.Create("Cola",              55m,  true, string.Empty, drink.Id),
                Product.Create("Turkish Coffee",    65m,  true, string.Empty, drink.Id),
            };
            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();
        }

        // Cash Registers
        if (!await context.CashRegisters.AnyAsync())
        {
            CashRegister[] cashRegisters = new[]
            {
                CashRegister.Create("Cash", 0m, CashRegisterStatus.Open, demoRestaurant.Id),
                CashRegister.Create("Card", 0m, CashRegisterStatus.Open, demoRestaurant.Id),
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
