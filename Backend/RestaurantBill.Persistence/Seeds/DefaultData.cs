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
            new { UserName = "admin",   Email = "admin@demo.com",   FullName = "Sistem Yöneticisi", UserCode = "0000", Password = "Admin123*",   Role = UserRole.Admin   },
            new { UserName = "waiter",  Email = "waiter@demo.com",  FullName = "Demo Garson",        UserCode = "1001", Password = "Waiter123*",  Role = UserRole.Waiter  },
            new { UserName = "kitchen", Email = "kitchen@demo.com", FullName = "Demo Mutfak",        UserCode = "1002", Password = "Kitchen123*", Role = UserRole.Kitchen },
            new { UserName = "cashier", Email = "cashier@demo.com", FullName = "Demo Kasiyer",       UserCode = "1003", Password = "Cashier123*", Role = UserRole.Cashier },
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
                UserId = admin!.Id.ToString(),
                Name = "Demo Restaurant",
                PhoneNumber = "0212 000 00 00",
                MobilePhoneNumber = "0532 000 00 00",
                Email = "info@demorestaurant.com",
                City = "İstanbul",
                District = "Kadıköy"
            };
            await context.Restaurants.AddAsync(restaurant);
            await context.SaveChangesAsync();
        }

        // Categories
        if (!await context.Categories.AnyAsync())
        {
            var categories = new[]
            {
                new Category { Name = "Başlangıçlar" },
                new Category { Name = "Ana Yemekler" },
                new Category { Name = "İçecekler" },
            };
            await context.Categories.AddRangeAsync(categories);
            await context.SaveChangesAsync();
        }

        // Products
        if (!await context.Products.AnyAsync())
        {
            var starter  = await context.Categories.FirstAsync(c => c.Name == "Başlangıçlar");
            var main     = await context.Categories.FirstAsync(c => c.Name == "Ana Yemekler");
            var drink    = await context.Categories.FirstAsync(c => c.Name == "İçecekler");

            var products = new[]
            {
                new Product { Name = "Çoban Salatası",     Price = 85m,  IsActive = true, CategoryId = starter.Id },
                new Product { Name = "Mercimek Çorbası",   Price = 75m,  IsActive = true, CategoryId = starter.Id },
                new Product { Name = "Humus",              Price = 90m,  IsActive = true, CategoryId = starter.Id },
                new Product { Name = "Beyti Sarma",        Price = 220m, IsActive = true, CategoryId = main.Id    },
                new Product { Name = "Adana Kebap",        Price = 240m, IsActive = true, CategoryId = main.Id    },
                new Product { Name = "Izgara Köfte",       Price = 200m, IsActive = true, CategoryId = main.Id    },
                new Product { Name = "Tavuk Şiş",          Price = 180m, IsActive = true, CategoryId = main.Id    },
                new Product { Name = "Karışık Pide",       Price = 160m, IsActive = true, CategoryId = main.Id    },
                new Product { Name = "Su (500ml)",         Price = 20m,  IsActive = true, CategoryId = drink.Id   },
                new Product { Name = "Ayran",              Price = 35m,  IsActive = true, CategoryId = drink.Id   },
                new Product { Name = "Kola",               Price = 55m,  IsActive = true, CategoryId = drink.Id   },
                new Product { Name = "Türk Kahvesi",       Price = 65m,  IsActive = true, CategoryId = drink.Id   },
            };
            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();
        }

        // Tables
        if (!await context.Tables.AnyAsync())
        {
            var restaurant = await context.Restaurants.FirstAsync();
            var tables = Enumerable.Range(1, 8).Select(i => new Table
            {
                Name = $"Masa {i}",
                Status = TableStatus.Available,
                RestaurantId = restaurant.Id
            }).ToList();

            await context.Tables.AddRangeAsync(tables);
            await context.SaveChangesAsync();
        }
    }
}
