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
        /// Authenticates the user credentials and generates a JWT upon successful login. 
        /// Resolves the associated restaurant ID for the user and includes it in the token.
        /// </summary>
        /// <param name="request">The login request containing the username and password.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>The generated JSON Web Token (JWT) as a string.</returns>
        /// <exception cref="BusinessException">Thrown when the username or password is incorrect.</exception>
        public async Task<string> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            User? user = !string.IsNullOrEmpty(request.UserName)
            ? await _userManager.FindByNameAsync(request.UserName)
            : await _userManager.FindByEmailAsync(request.Email!);

            if (user == null)
                throw new BusinessException("Kullanıcı adı, email veya şifre hatalı!");

            var isPasswordCorrect = await _userManager.CheckPasswordAsync(user, request.Password);
            
            if (!isPasswordCorrect)
                throw new BusinessException("Kullanıcı adı, email veya şifre hatalı!");

            int restaurantId = user.RestaurantId;
            if (restaurantId == 0)
            {
                var restaurants = await _uow.Restaurant.GetAllAsync(x => x.UserId == user.Id, false);
                restaurantId = restaurants.FirstOrDefault()?.Id ?? 0;
            }

            return GenerateJwtToken(user, restaurantId);
        }
        /// <summary>
        /// Generates a JWT containing the necessary authorization claims based on the authenticated user details and restaurant ID.
        /// </summary>
        /// <param name="user">The authenticated user entity.</param>
        /// <param name="restaurantId">The ID of the restaurant associated with the user.</param>
        /// <returns>The signed JWT string.</returns>
        private string GenerateJwtToken(User user, int restaurantId)
        {
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
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