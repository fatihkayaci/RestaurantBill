using RestaurantBill.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Persistence.Repositories;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Business.Mappings;
using RestaurantBill.WebAPI.Middlewares;
using FluentValidation.AspNetCore;
using FluentValidation;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Services;
using RestaurantBill.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;
using RestaurantBill.Application.Validators.OrderItem;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using MediatR;
using RestaurantBill.Application.Behaviors;

var builder = WebApplication.CreateBuilder(args);

// Jwt settings first step.
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];

builder.Services.AddControllers();

#region swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "RestaurantBill API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme()
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Lütfen token'ınızı girerken başına 'Bearer ' yazmayı unutmayın.\r\n\r\nÖrnek: \"Bearer eyJhbGciOiJIUzI1...\""
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
    
#endregion

// builder.Services.AddOpenApi();

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
builder.Services.AddScoped<IAuthService, AuthService>();    
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
    builder.Services.AddIdentity<User, AppRole>(options =>
    {
        options.Password.RequireDigit = false;
        options.Password.RequiredLength = 6;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
    })
    .AddEntityFrameworkStores<RestaurantBillDbContext>()
    .AddDefaultTokenProviders();

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:SecretKey"]!))
        };
    });
#endregion 


/* fluent validation for service */
builder.Services.AddFluentValidationAutoValidation(); 
builder.Services.AddValidatorsFromAssemblyContaining<RemoveOrderItemDtoValidator>();

/* fluent validation for CQRS pattern */
builder.Services.AddMediatR(cfg => 
{
    cfg.RegisterServicesFromAssemblyContaining<CreateOrderCommand>();
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
});
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
    /*scalar
    app.MapOpenApi(); // JSON'ı üretir
    app.MapScalarApiReference();
    */
    app.UseSwagger();
    app.UseSwaggerUI(); 
}

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<RestaurantBillDbContext>();
        context.Database.Migrate();
        
        var userManager = services.GetRequiredService<UserManager<User>>();
        var roleManager = services.GetRequiredService<RoleManager<AppRole>>();
        
        await RestaurantBill.Persistence.Seeds.DefaultData.SeedAsync(roleManager, userManager);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Veritabanı migration veya seed işlemi sırasında bir hata oluştu.");
    }
}
app.Run();