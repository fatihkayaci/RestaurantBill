
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly ICurrentUserService _currentUser;

        public CreateUserCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher, ICurrentUserService currentUser)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
            _currentUser = currentUser;
        }

        public async Task Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;

            bool userNameExists = (await _uow.User.GetAllAsync(u => u.UserName == request.UserName && u.RestaurantId == restaurantId, false)).Any();
            if (userNameExists)
                throw new BusinessException("Bu kullanıcı adı zaten kullanımda.");

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email, false)).Any();
                if (emailExists)
                    throw new BusinessException("Bu e-posta adresi zaten kullanımda.");
            }

            User user = User.Create(request.FullName, request.UserName, request.Email, request.PhoneNumber, request.UserCode, request.Role, restaurantId);
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.PasswordHash));

            await _uow.User.AddAsync(user);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}

