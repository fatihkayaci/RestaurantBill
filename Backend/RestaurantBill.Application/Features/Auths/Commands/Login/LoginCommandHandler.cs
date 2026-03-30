using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Auths.Commands.Login
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, string>
    {
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;
        private readonly IUnitOfWork _uow;

        public LoginCommandHandler(IUnitOfWork uow, UserManager<User> userManager, IConfiguration configuration)
        {
            _uow = uow;
            _userManager = userManager;
            _configuration = configuration;
        }
        /// <summary>
        /// will write
        /// </summary>
        public async Task<string> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            var user = await _userManager.FindByNameAsync(request.UserName);
            if (user == null)
                throw new BusinessException("Kullanıcı adı veya şifre hatalı!");

            var isPasswordCorrect = await _userManager.CheckPasswordAsync(user, request.Password);
            
            if (!isPasswordCorrect)
                throw new BusinessException("Kullanıcı adı veya şifre hatalı!");

            var restaurants = await _uow.Restaurant.GetAllAsync(x => x.UserId == user.Id.ToString(), false);
            var restaurantId = restaurants.FirstOrDefault()?.Id ?? 0;

            return GenerateJwtToken(user, restaurantId);
        }
        private string GenerateJwtToken(User user, int restaurantId)
        {
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.UserName!),
                new Claim("FullName", user.FullName),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("RestaurantId", restaurantId.ToString()) 
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