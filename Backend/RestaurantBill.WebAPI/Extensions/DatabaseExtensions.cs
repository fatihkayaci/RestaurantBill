using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.WebAPI.Extensions;

public static class DatabaseExtensions
{
    public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<RestaurantBillDbContext>(options =>
        {
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));
        });

        return services;
    }

    public static async Task MigrateAndSeedAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<RestaurantBillDbContext>();
            context.Database.Migrate();

            // Seed geçici olarak devre dışı: Branch.Create henüz CompanyId almıyor.
            // var passwordHasher = services.GetRequiredService<IPasswordHasher<User>>();
            // await RestaurantBill.Persistence.Seeds.DefaultData.SeedAsync(context, passwordHasher);
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "Veritabanı migration veya seed işlemi sırasında bir hata oluştu.");
        }
    }
}
