using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Login
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<string>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IConfiguration _configuration;
        private readonly ITenantResolver _tenantResolver;

        public LoginCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher, IConfiguration configuration, ITenantResolver tenantResolver)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
            _configuration = configuration;
            _tenantResolver = tenantResolver;
        }

        public async Task<Result<string>> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            string identifier = !string.IsNullOrWhiteSpace(request.UserName) ? request.UserName : request.Email!;
            string? slug = _tenantResolver.Slug;

            UserRestaurant? userRestaurant;

            if (!string.IsNullOrWhiteSpace(slug))
            {
                Restaurant? restaurant = (await _uow.Restaurant.GetAllAsync(r => r.Slug == slug, false)).FirstOrDefault();

                if (restaurant is null)
                {
                    return Result<string>.Failure("Restoran bulunamadı.");
                }

                userRestaurant = (await _uow.UserRestaurant.GetAllAsync(ur =>
                    (ur.UserName == identifier || ur.User.Email == identifier)
                    && ur.RestaurantId == restaurant.Id
                    && !ur.IsDeleted
                    && !ur.User.IsDeleted, false, nameof(RestaurantBill.Domain.Entities.UserRestaurant.User))).FirstOrDefault();
            }
            else
            {
                User? userByEmail = (await _uow.User.GetAllAsync(u => u.Email == identifier && !u.IsDeleted, false)).FirstOrDefault();
                userRestaurant = userByEmail is null
                    ? null
                    : (await _uow.UserRestaurant.GetAllAsync(ur => ur.UserId == userByEmail.Id && !ur.IsDeleted, false, nameof(RestaurantBill.Domain.Entities.UserRestaurant.User))).FirstOrDefault();
            }

            if (userRestaurant == null)
                return Result<string>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            User user = userRestaurant.User;

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
                return Result<string>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            // if (!user.IsActive)
            //     throw new BusinessException("Hesabınız pasif durumda. Giriş yapabilmek için yöneticinizle iletişime geçin.");

            return Result<string>.Success(GenerateJwtToken(userRestaurant));
        }

        private string GenerateJwtToken(UserRestaurant userRestaurant)
        {
            User user = userRestaurant.User;

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, userRestaurant.UserName),
                new Claim("FullName", user.FullName),
                new Claim(ClaimTypes.Role, userRestaurant.Role.ToString()),
                new Claim("RestaurantId", userRestaurant.RestaurantId.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:SecretKey"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var tokenOptions = new JwtSecurityToken(
                issuer: _configuration["JwtSettings:Issuer"],
                audience: _configuration["JwtSettings:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(tokenOptions);
        }
    }
}
