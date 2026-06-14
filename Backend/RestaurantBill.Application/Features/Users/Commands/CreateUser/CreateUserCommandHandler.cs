using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand>
    {
        private readonly UserManager<User> _userManager;
        private readonly ICurrentUserService _currentUser;

        public CreateUserCommandHandler(ICurrentUserService currentUser, UserManager<User> userManager)
        {
            _userManager = userManager;
            _currentUser = currentUser;
        }

        public async Task Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            User user = User.Create(request.FullName, request.UserName, request.Email, request.PhoneNumber, request.UserCode, request.Role, restaurantId);
            IdentityResult result = await _userManager.CreateAsync(user, request.PasswordHash);
            if (!result.Succeeded)
            {
                string errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }
        }
    }
}
