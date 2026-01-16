using RestaurantBill.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Infrastructure.Repositories;
using RestaurantBill.Business.Services;
using RestaurantBill.Business.Mappings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
// builder.Services.AddEndpointsApiExplorer();
// builder.Services.AddSwaggerGen();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<RestaurantBillDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddAutoMapper(typeof(MappingProfile));
var app = builder.Build();
app.UseHttpsRedirection();
app.MapControllers();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // JSON'ı üretir
    app.MapScalarApiReference();
}
app.Run();