using RestaurantBill.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Infrastructure.Repositories;
using RestaurantBill.Business.Services;
using RestaurantBill.Business.Mappings;
using RestaurantBill.Core;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
// builder.Services.AddEndpointsApiExplorer();
// builder.Services.AddSwaggerGen();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<RestaurantBillDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ITableService, TableService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IOrderItemService, OrderItemService>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddAutoMapper(typeof(MappingProfile));
var app = builder.Build();
app.UseHttpsRedirection();
app.MapControllers();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // JSON'ı üretir
    app.MapScalarApiReference();
}

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<RestaurantBillDbContext>();
        context.Database.Migrate();
        RestaurantBill.Infrastructure.Seeds.DefaultData.Seed(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Veritabanı migration işlemi sırasında bir hata oluştu.");
    }
}
app.Run();