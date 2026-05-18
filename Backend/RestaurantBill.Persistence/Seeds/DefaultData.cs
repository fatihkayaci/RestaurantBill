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

        foreach (string role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new AppRole { Name = role });
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

            User user = User.Create(u.FullName, u.UserName, u.Email, null, u.UserCode, u.Role, restaurantId: 0);
            IdentityResult result = await userManager.CreateAsync(user, u.Password);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, u.Role.ToString());
        }
    }

    private static async Task SeedDemoDataAsync(RestaurantBillDbContext context, UserManager<User> userManager)
    {
        // Restaurant
        if (!await context.Restaurants.AnyAsync())
        {
            User? admin = await userManager.FindByNameAsync("admin");
            Restaurant restaurant = Restaurant.Create(admin!.Id);
            restaurant.Update("Demo Restaurant", "0212 000 00 00", "0532 000 00 00", "info@demorestaurant.com", "Istanbul", "Kadikoy");
            await context.Restaurants.AddAsync(restaurant);
            await context.SaveChangesAsync();
        }

        // Link all users to the restaurant
        Restaurant demoRestaurant = await context.Restaurants.FirstAsync();
        foreach (string userName in new[] { "admin", "waiter", "kitchen", "cashier" })
        {
            User? user = await userManager.FindByNameAsync(userName);
            if (user != null && user.RestaurantId == 0)
            {
                user.AssignRestaurant(demoRestaurant.Id);
                await userManager.UpdateAsync(user);
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
                Product.Create("Garden Salad",      85m,  true, string.Empty, starter.Id, demoRestaurant.Id),
                Product.Create("Lentil Soup",       75m,  true, string.Empty, starter.Id, demoRestaurant.Id),
                Product.Create("Hummus",            90m,  true, string.Empty, starter.Id, demoRestaurant.Id),
                Product.Create("Beyti Wrap",        220m, true, string.Empty, main.Id,    demoRestaurant.Id),
                Product.Create("Adana Kebab",       240m, true, string.Empty, main.Id,    demoRestaurant.Id),
                Product.Create("Grilled Meatballs", 200m, true, string.Empty, main.Id,    demoRestaurant.Id),
                Product.Create("Chicken Skewer",    180m, true, string.Empty, main.Id,    demoRestaurant.Id),
                Product.Create("Mixed Pide",        160m, true, string.Empty, main.Id,    demoRestaurant.Id),
                Product.Create("Water (500ml)",     20m,  true, string.Empty, drink.Id,   demoRestaurant.Id),
                Product.Create("Ayran",             35m,  true, string.Empty, drink.Id,   demoRestaurant.Id),
                Product.Create("Cola",              55m,  true, string.Empty, drink.Id,   demoRestaurant.Id),
                Product.Create("Turkish Coffee",    65m,  true, string.Empty, drink.Id,   demoRestaurant.Id),
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

        // Tables
        if (!await context.Tables.AnyAsync())
        {
            List<Table> tables = Enumerable.Range(1, 8)
                .Select(i => Table.Create($"Table {i}", string.Empty, demoRestaurant.Id))
                .ToList();
            await context.Tables.AddRangeAsync(tables);
            await context.SaveChangesAsync();
        }
    }
}
