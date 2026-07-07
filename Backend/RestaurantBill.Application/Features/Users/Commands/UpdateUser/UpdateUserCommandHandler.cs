using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser
{
    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;

        public UpdateUserCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
        }

        public async Task Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            User user = await _uow.User.GetByIdAsync(request.UserId, true)
                ?? throw new NotFoundException("Kullanıcı bulunamadı.");

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email && u.Id != request.UserId && !u.IsDeleted, false)).Any();
                if (emailExists)
                    throw new BusinessException("Bu e-posta adresi zaten kullanımda.");
            }

            user.Update(request.FullName, request.UserName, request.Email, request.PhoneNumber, request.UserCode, request.Role, request.IsActive ?? user.IsActive);

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));

            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
