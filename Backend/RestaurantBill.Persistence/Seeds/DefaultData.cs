using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Persistence.Seeds;

public static class DefaultData
{
    public static async Task SeedAsync(RoleManager<AppRole> roleManager, UserManager<User> userManager)
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

        if (await userManager.FindByNameAsync("admin") == null)
        {
            var adminUser = new User
            {
                UserName = "admin",
                Email = "admin@restoran.com",
                FullName = "Sistem Yöneticisi",
                UserCode = "0000",
                Role = UserRole.Admin
            };

            var result = await userManager.CreateAsync(adminUser, "Admin123*");
            
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, UserRole.Admin.ToString());
            }
        }
    }
}