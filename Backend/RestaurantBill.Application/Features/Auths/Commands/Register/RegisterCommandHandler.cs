using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Auths.Commands.Register
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand>
    {
        private readonly UserManager<User> _userManager;
        private readonly IUnitOfWork _uow;

        public RegisterCommandHandler(UserManager<User> userManager, IUnitOfWork uow)
        {
            _userManager = userManager;
            _uow = uow;
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
            string userCode = $"USR-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            User user = User.Create(request.FullName, request.UserName, request.Email, null, userCode, UserRole.Admin, restaurantId: 0);

            IdentityResult result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {
                string errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BusinessException($"Kayıt başarısız: {errors}");
            }

            Restaurant restaurant = Restaurant.Create(user.Id);
            await _uow.Restaurant.AddAsync(restaurant);
            await _uow.SaveChangesAsync(cancellationToken);

            user.AssignRestaurant(restaurant.Id);
            await _userManager.UpdateAsync(user);
            
        }
    }
}