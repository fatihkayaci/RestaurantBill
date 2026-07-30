using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser
{
    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly ICurrentUserService _currentUser;

        public UpdateUserCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher, ICurrentUserService currentUser)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            User? user = await _uow.User.GetByIdAsync(request.UserId, true);
            if (user is null) return Result.Failure("Kullanıcı bulunamadı.");

            UserRestaurant? userRestaurant = (await _uow.UserRestaurant.GetAllAsync(ur => ur.UserId == request.UserId && !ur.IsDeleted, true)).FirstOrDefault();
            if (userRestaurant is null)
            {
                bool isOwner = (await _uow.Restaurant.GetAllAsync(r => r.OwnerUserId == request.UserId && !r.IsDeleted, false)).Any();
                if (!isOwner) return Result.Failure("Kullanıcı bulunamadı.");
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email && u.Id != request.UserId && !u.IsDeleted, false)).Any();
                if (emailExists)
                    return Result.Failure("Bu e-posta adresi zaten kullanımda.");
            }

            if (userRestaurant is not null && request.RestaurantId.HasValue && request.RestaurantId.Value != userRestaurant.RestaurantId)
            {
                if (_currentUser.Role != nameof(UserRole.Owner))
                    return Result.Failure("Bu şubeye kullanıcı taşıma yetkiniz yok.");

                Restaurant? targetRestaurant = (await _uow.Restaurant.GetAllAsync(
                    r => r.Id == request.RestaurantId.Value && r.OwnerUserId == _currentUser.UserId && !r.IsDeleted, false)).FirstOrDefault();
                if (targetRestaurant is null)
                    return Result.Failure("Şube bulunamadı.");

                bool userNameExists = (await _uow.UserRestaurant.GetAllAsync(
                    ur => ur.UserName == request.UserName && ur.RestaurantId == targetRestaurant.Id && ur.UserId != request.UserId && !ur.IsDeleted, false)).Any();
                if (userNameExists)
                    return Result.Failure("Bu kullanıcı adı zaten kullanımda.");

                bool userCodeExists = (await _uow.UserRestaurant.GetAllAsync(
                    ur => ur.UserCode == request.UserCode && ur.RestaurantId == targetRestaurant.Id && ur.UserId != request.UserId && !ur.IsDeleted, false)).Any();
                if (userCodeExists)
                    return Result.Failure("Bu kullanıcı kodu zaten kullanımda.");

                userRestaurant.ChangeRestaurant(targetRestaurant);
            }

            user.Update(request.FullName, request.Email, request.PhoneNumber, request.IsActive ?? user.IsActive);
            userRestaurant?.Update(request.UserName, request.UserCode, request.Role);

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
