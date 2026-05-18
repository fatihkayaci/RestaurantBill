using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly UserManager<User> _userManager;
        private readonly ICurrentUserService _currentUser;

        public CreateUserCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser, UserManager<User> userManager)
        {
            _uow = uow;
            _userManager = userManager;
            _currentUser = currentUser;
        }

        public async Task Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            User user = User.Create(request.FullName, request.UserName, request.Email, request.PhoneNumber, request.UserCode, request.Role, restaurantId);
            await _userManager.CreateAsync(user, request.PasswordHash);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
