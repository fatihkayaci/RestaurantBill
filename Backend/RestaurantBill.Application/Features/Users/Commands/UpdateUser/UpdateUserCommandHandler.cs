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

            UserBranch? userBranch = (await _uow.UserBranch.GetAllAsync(ur => ur.UserId == request.UserId && !ur.IsDeleted, true)).FirstOrDefault();
            if (userBranch is null)
            {
                bool isOwner = (await _uow.Company.GetAllAsync(c => c.OwnerUserId == request.UserId && !c.IsDeleted, false)).Any();
                if (!isOwner) return Result.Failure("Kullanıcı bulunamadı.");
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email && u.Id != request.UserId && !u.IsDeleted, false)).Any();
                if (emailExists)
                    return Result.Failure("Bu e-posta adresi zaten kullanımda.");
            }

            if (userBranch is not null && request.BranchId.HasValue && request.BranchId.Value != userBranch.BranchId)
            {
                if (_currentUser.Role != nameof(UserRole.Owner))
                    return Result.Failure("Bu şubeye kullanıcı taşıma yetkiniz yok.");

                Branch? targetBranch = (await _uow.Branch.GetAllAsync(
                    b => b.Id == request.BranchId.Value && b.Company.OwnerUserId == _currentUser.UserId && !b.IsDeleted, false, nameof(Branch.Company))).FirstOrDefault();
                if (targetBranch is null)
                    return Result.Failure("Şube bulunamadı.");

                bool userNameExists = (await _uow.UserBranch.GetAllAsync(
                    ur => ur.UserName == request.UserName && ur.BranchId == targetBranch.Id && ur.UserId != request.UserId && !ur.IsDeleted, false)).Any();
                if (userNameExists)
                    return Result.Failure("Bu kullanıcı adı zaten kullanımda.");

                bool userCodeExists = (await _uow.UserBranch.GetAllAsync(
                    ur => ur.UserCode == request.UserCode && ur.BranchId == targetBranch.Id && ur.UserId != request.UserId && !ur.IsDeleted, false)).Any();
                if (userCodeExists)
                    return Result.Failure("Bu kullanıcı kodu zaten kullanımda.");

                userBranch.ChangeBranch(targetBranch);
            }

            user.Update(request.FullName, request.Email, request.PhoneNumber, request.IsActive ?? user.IsActive);
            userBranch?.Update(request.UserName, request.UserCode, request.Role);

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
