using Scalar.AspNetCore;
using RestaurantBill.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Persistence.Repositories;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Business.Mappings;
using RestaurantBill.WebAPI.Middlewares;
using FluentValidation.AspNetCore;
using FluentValidation;
using RestaurantBill.Application.Validators;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Services;

var builder = WebApplication.CreateBuilder(args);

// Jwt settings first step.
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];

builder.Services.AddControllers();
/*swagger*/
    // builder.Services.AddEndpointsApiExplorer();
    // builder.Services.AddSwaggerGen();
/*swagger*/
builder.Services.AddOpenApi();

builder.Services.AddDbContext<RestaurantBillDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

#region Configuration for service
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IOrderItemService, OrderItemService>();
// builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IRestaurantService, RestaurantService>();
builder.Services.AddScoped<ITableService, TableService>();
builder.Services.AddScoped<IUserService, UserService>();    
#endregion

#region configuration for repository
// typeof used because I don't know type. If I know type so builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IOrderItemRepository, OrderItemRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IRestaurantRepository, RestaurantRepository>();
builder.Services.AddScoped<ITableRepository, TableRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
#endregion

builder.Services.AddAutoMapper(typeof(MappingProfile));
/* fluent validation */
builder.Services.AddFluentValidationAutoValidation(); 
builder.Services.AddValidatorsFromAssemblyContaining<RemoveOrderItemDtoValidator>();

/* MediatR Service Configuration*/
builder.Services.AddMediatR(cfg => {
    // Burada Application katmanından herhangi bir sınıfı referans gösteriyoruz ki o katmanı tarasın
    cfg.RegisterServicesFromAssembly(typeof(RestaurantBill.Application.AssemblyReference).Assembly); 
});
#region Cors Settings
/*
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("IzinVer",
            builder =>
            {
                builder.AllowAnyOrigin()  // Her yerden gelen isteğe izin ver
                    .AllowAnyMethod()  // GET, POST, PUT, DELETE hepsine izin ver
                    .AllowAnyHeader(); // Tüm başlıklara izin ver
            });
    });
*/  
#endregion

#region Authentication service added.
    /*
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(secretKey!))
        };
    });
    */
#endregion 


var app = builder.Build();
app.UseCors("IzinVer");
app.UseHttpsRedirection();
// MiddleWares
app.UseMiddleware<ExceptionMiddleware>();
// for Authentication

app.UseAuthentication(); // <-- first "who are you?" (id control)
app.UseAuthorization();  // <-- second "are you have authority?" (authority control)
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
        // RestaurantBill.Infrastructure.Seeds.DefaultData.Seed(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Veritabanı migration işlemi sırasında bir hata oluştu.");
    }
}
app.Run();