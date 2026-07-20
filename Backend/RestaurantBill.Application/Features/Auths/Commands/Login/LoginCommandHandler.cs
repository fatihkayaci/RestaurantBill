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

namespace RestaurantBill.Application.Features.Auths.Commands.Login
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, string>
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

        public async Task<string> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            string identifier = !string.IsNullOrWhiteSpace(request.UserName) ? request.UserName : request.Email!;
            string? slug = _tenantResolver.Slug;

            User? user;

            if (!string.IsNullOrWhiteSpace(slug))
            {
                Restaurant restaurant = (await _uow.Restaurant.GetAllAsync(r => r.Slug == slug, false)).FirstOrDefault()
                    ?? throw new BusinessException("Restoran bulunamadı.");

                user = (await _uow.User.GetAllAsync(u =>
                    (u.UserName == identifier || u.Email == identifier)
                    && u.RestaurantId == restaurant.Id
                    && !u.IsDeleted, false)).FirstOrDefault();
            }
            else
            {
                user = (await _uow.User.GetAllAsync(u => u.Email == identifier && !u.IsDeleted, false)).FirstOrDefault();
            }

            if (user == null)
                throw new BusinessException("Kullanıcı adı, email veya şifre hatalı!");

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
                throw new BusinessException("Kullanıcı adı, email veya şifre hatalı!");

            // if (!user.IsActive)
            //     throw new BusinessException("Hesabınız pasif durumda. Giriş yapabilmek için yöneticinizle iletişime geçin.");

            return GenerateJwtToken(user);
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.UserName),
                new Claim("FullName", user.FullName),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("RestaurantId", user.RestaurantId.ToString())
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
