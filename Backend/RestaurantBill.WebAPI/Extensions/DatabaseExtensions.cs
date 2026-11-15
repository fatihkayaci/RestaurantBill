using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Tables.Queries;
using RestaurantBill.Application.Interfaces;
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

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<RestaurantBillDbContext>());
        services.AddScoped<ReservationQueries>();
        services.AddScoped<OrderQueries>();

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

            var passwordHasher = services.GetRequiredService<IPasswordHasher<User>>();
            await RestaurantBill.Persistence.Seeds.DefaultData.SeedAsync(context, passwordHasher);
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "Veritabanı migration veya seed işlemi sırasında bir hata oluştu.");
        }

        await SeedStockImagesAsync(services);
    }

    // Hazır görsel kataloğu (Persistence/Seeds/stock-images.json). Ayrı tutulur: demo verisi yalnızca boş veritabanında
    // çalışır, katalog her açılışta dosyayla eşitlenir. Hata açılışı durdurmaz.
    private static async Task SeedStockImagesAsync(IServiceProvider services)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        try
        {
            var context = services.GetRequiredService<RestaurantBillDbContext>();
            var result = await RestaurantBill.Persistence.Seeds.StockImageSeed.SeedFromEmbeddedFileAsync(context);
            if (result.Added > 0 || result.Updated > 0)
                logger.LogInformation("Hazır görsel kataloğu: {Added} eklendi, {Updated} güncellendi.", result.Added, result.Updated);
            foreach (string error in result.Errors)
                logger.LogWarning("Hazır görsel kataloğu satırı atlandı: {Error}", error);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Hazır görsel kataloğu yüklenemedi.");
        }
    }
}
