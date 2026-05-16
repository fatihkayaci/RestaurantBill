using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Seeds;

public static class DefaultData
{
    public static async Task SeedAsync(RoleManager<AppRole> roleManager, UserManager<User> userManager, RestaurantBillDbContext context)
    {
        await SeedRolesAsync(roleManager);
        await SeedUsersAsync(userManager);
        await SeedDemoDataAsync(context, userManager);
    }

    private static async Task SeedRolesAsync(RoleManager<AppRole> roleManager)
    {
        string[] roles = {
            UserRole.Admin.ToString(),
            UserRole.Waiter.ToString(),
            UserRole.Cashier.ToString(),
            UserRole.Kitchen.ToString()
        };

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new AppRole { Name = role });
            }
        }
    }

    private static async Task SeedUsersAsync(UserManager<User> userManager)
    {
        var demoUsers = new[]
        {
            new { UserName = "admin",   Email = "admin@demo.com",   FullName = "System Administrator", UserCode = "0000", Password = "Admin123*",   Role = UserRole.Admin   },
            new { UserName = "waiter",  Email = "waiter@demo.com",  FullName = "Demo Waiter",          UserCode = "1001", Password = "Waiter123*",  Role = UserRole.Waiter  },
            new { UserName = "kitchen", Email = "kitchen@demo.com", FullName = "Demo Kitchen",         UserCode = "1002", Password = "Kitchen123*", Role = UserRole.Kitchen },
            new { UserName = "cashier", Email = "cashier@demo.com", FullName = "Demo Cashier",         UserCode = "1003", Password = "Cashier123*", Role = UserRole.Cashier },
        };

        foreach (var u in demoUsers)
        {
            if (await userManager.FindByNameAsync(u.UserName) != null) continue;

            var user = new User
            {
                UserName = u.UserName,
                Email = u.Email,
                FullName = u.FullName,
                UserCode = u.UserCode,
                Role = u.Role
            };

            var result = await userManager.CreateAsync(user, u.Password);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, u.Role.ToString());
            }
        }
    }

    private static async Task SeedDemoDataAsync(RestaurantBillDbContext context, UserManager<User> userManager)
    {
        // Restaurant
        if (!await context.Restaurants.AnyAsync())
        {
            var admin = await userManager.FindByNameAsync("admin");
            var restaurant = new Restaurant
            {
                UserId = admin!.Id,
                Name = "Demo Restaurant",
                PhoneNumber = "0212 000 00 00",
                MobilePhoneNumber = "0532 000 00 00",
                Email = "info@demorestaurant.com",
                City = "Istanbul",
                District = "Kadikoy"
            };
            await context.Restaurants.AddAsync(restaurant);
            await context.SaveChangesAsync();
        }

        // Link all users to the restaurant
        var demoRestaurant = await context.Restaurants.FirstAsync();
        foreach (var userName in new[] { "admin", "waiter", "kitchen", "cashier" })
        {
            var user = await userManager.FindByNameAsync(userName);
            if (user != null && user.RestaurantId == 0)
            {
                user.RestaurantId = demoRestaurant.Id;
                await userManager.UpdateAsync(user);
            }
        }

        // Categories
        if (!await context.Categories.AnyAsync())
        {
            var categories = new[]
            {
                new Category { Name = "Starters",    RestaurantId = demoRestaurant.Id },
                new Category { Name = "Main Course", RestaurantId = demoRestaurant.Id },
                new Category { Name = "Beverages",   RestaurantId = demoRestaurant.Id },
            };
            await context.Categories.AddRangeAsync(categories);
            await context.SaveChangesAsync();
        }

        // Products
        if (!await context.Products.AnyAsync())
        {
            var starter = await context.Categories.FirstAsync(c => c.Name == "Starters");
            var main    = await context.Categories.FirstAsync(c => c.Name == "Main Course");
            var drink   = await context.Categories.FirstAsync(c => c.Name == "Beverages");

            var products = new[]
            {
                new Product { Name = "Garden Salad",      Price = 85m,  IsActive = true, CategoryId = starter.Id, RestaurantId = demoRestaurant.Id },
                new Product { Name = "Lentil Soup",       Price = 75m,  IsActive = true, CategoryId = starter.Id, RestaurantId = demoRestaurant.Id },
                new Product { Name = "Hummus",            Price = 90m,  IsActive = true, CategoryId = starter.Id, RestaurantId = demoRestaurant.Id },
                new Product { Name = "Beyti Wrap",        Price = 220m, IsActive = true, CategoryId = main.Id,    RestaurantId = demoRestaurant.Id },
                new Product { Name = "Adana Kebab",       Price = 240m, IsActive = true, CategoryId = main.Id,    RestaurantId = demoRestaurant.Id },
                new Product { Name = "Grilled Meatballs", Price = 200m, IsActive = true, CategoryId = main.Id,    RestaurantId = demoRestaurant.Id },
                new Product { Name = "Chicken Skewer",    Price = 180m, IsActive = true, CategoryId = main.Id,    RestaurantId = demoRestaurant.Id },
                new Product { Name = "Mixed Pide",        Price = 160m, IsActive = true, CategoryId = main.Id,    RestaurantId = demoRestaurant.Id },
                new Product { Name = "Water (500ml)",     Price = 20m,  IsActive = true, CategoryId = drink.Id,   RestaurantId = demoRestaurant.Id },
                new Product { Name = "Ayran",             Price = 35m,  IsActive = true, CategoryId = drink.Id,   RestaurantId = demoRestaurant.Id },
                new Product { Name = "Cola",              Price = 55m,  IsActive = true, CategoryId = drink.Id,   RestaurantId = demoRestaurant.Id },
                new Product { Name = "Turkish Coffee",    Price = 65m,  IsActive = true, CategoryId = drink.Id,   RestaurantId = demoRestaurant.Id },
            };
            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();
        }

        // Cash Registers
        if (!await context.CashRegisters.AnyAsync())
        {
            var cashRegisters = new[]
            {
                new CashRegister { Name = "Cash", Balance = 0m, Status = CashRegisterStatus.Open, RestaurantId = demoRestaurant.Id },
                new CashRegister { Name = "Card", Balance = 0m, Status = CashRegisterStatus.Open, RestaurantId = demoRestaurant.Id },
            };
            await context.CashRegisters.AddRangeAsync(cashRegisters);
            await context.SaveChangesAsync();
        }

        // Tables
        if (!await context.Tables.AnyAsync())
        {
            var tables = Enumerable.Range(1, 8).Select(i => new Table
            {
                Name = $"Table {i}",
                Status = TableStatus.Available,
                RestaurantId = demoRestaurant.Id
            }).ToList();

            await context.Tables.AddRangeAsync(tables);
            await context.SaveChangesAsync();
        }
    }
}
