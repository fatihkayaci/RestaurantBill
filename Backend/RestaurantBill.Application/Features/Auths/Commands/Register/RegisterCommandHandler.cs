using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Auths.Commands.Register
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand>
    {
        private readonly UserManager<User> _userManager;

        public RegisterCommandHandler(UserManager<User> userManager)
        {
            _userManager = userManager;
        }
        /// <summary>
        /// Registers a new user in the system using the provided request details and assigns them the 'Admin' role by default.
        /// Throws a business exception containing aggregated identity validation errors if the creation fails.
        /// </summary>
        /// <param name="request">The command containing the user's registration details.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <exception cref="BusinessException">Thrown when user creation fails due to validation errors (e.g., weak password, duplicate user).</exception>
        public async Task Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            var user = new User
            {
                FullName = request.FullName,
                UserName = request.UserName,
                Email = request.Email,
                UserCode = $"USR-{Guid.NewGuid().ToString("N")[..6].ToUpper()}",
                Role = UserRole.Admin
            };

            var result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BusinessException($"Kayıt başarısız: {errors}");
            }
        }
    }
}