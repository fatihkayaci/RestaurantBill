using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Persistence.Context;
using RestaurantBill.WebAPI.Services;
using System.Text;

namespace RestaurantBill.WebAPI.Extensions;

public static class AuthExtensions
{
    public static IServiceCollection AddIdentityWithJwt(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddIdentity<User, AppRole>(options =>
        {
            options.Password.RequireDigit = false;
            options.Password.RequiredLength = 6;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
        })
        .AddEntityFrameworkStores<RestaurantBillDbContext>()
        .AddDefaultTokenProviders()
        .AddErrorDescriber<TurkishIdentityErrorDescriber>();

        services.AddAuthentication(options =>
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
                ValidIssuer = configuration["JwtSettings:Issuer"],
                ValidAudience = configuration["JwtSettings:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["JwtSettings:SecretKey"]!))
            };
        });

        return services;
    }
}
