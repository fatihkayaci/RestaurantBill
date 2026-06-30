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
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;

        public RegisterCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
        }

        public async Task Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            bool userNameExists = (await _uow.User.GetAllAsync(u => u.UserName == request.UserName, false)).Any();
            if (userNameExists)
                throw new BusinessException("Bu kullanıcı adı zaten kullanımda.");

            bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email, false)).Any();
            if (emailExists)
                throw new BusinessException("Bu e-posta adresi zaten kullanımda.");

            Restaurant restaurant = Restaurant.Create();

            string userCode = $"USR-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            User user = User.Create(request.FullName, request.UserName, request.Email, null, userCode, UserRole.Admin, restaurant);
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));

            await _uow.Restaurant.AddAsync(restaurant);
            await _uow.User.AddAsync(user);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
