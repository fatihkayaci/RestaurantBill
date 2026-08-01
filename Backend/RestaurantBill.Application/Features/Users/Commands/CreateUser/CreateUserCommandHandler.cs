
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Result>
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

        public async Task<Result> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;

            if (request.BranchId.HasValue && request.BranchId.Value != restaurantId)
            {
                if (_currentUser.Role != nameof(UserRole.Owner))
                    return Result.Failure("Bu şubeye kullanıcı ekleme yetkiniz yok.");

                bool ownsRestaurant = (await _uow.Branch.GetAllAsync(
                    b => b.Id == request.BranchId.Value && b.Company.OwnerUserId == _currentUser.UserId && !b.IsDeleted, false, nameof(Branch.Company))).Any();
                if (!ownsRestaurant)
                    return Result.Failure("Şube bulunamadı.");

                restaurantId = request.BranchId.Value;
            }

            Branch? branch = await _uow.Branch.GetByIdAsync(restaurantId, true);
            if (branch is null)
                return Result.Failure("Restoran bulunamadı.");

            bool userNameExists = (await _uow.UserBranch.GetAllAsync(ur => ur.UserName == request.UserName && ur.Branch.CompanyId == branch.CompanyId && !ur.IsDeleted, false)).Any();
            if (userNameExists)
                return Result.Failure("Bu kullanıcı adı zaten kullanımda.");

            bool userCodeExists = (await _uow.UserBranch.GetAllAsync(ur => ur.UserCode == request.UserCode && ur.Branch.CompanyId == branch.CompanyId && !ur.IsDeleted, false)).Any();
            if (userCodeExists)
                return Result.Failure("Bu kullanıcı kodu zaten kullanımda.");

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email && !u.IsDeleted, false)).Any();
                if (emailExists)
                    return Result.Failure("Bu e-posta adresi zaten kullanımda.");
            }

            User user = User.Create(request.FullName, request.Email ?? string.Empty, request.PhoneNumber ?? string.Empty);
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.PasswordHash));
            UserBranch userBranch = UserBranch.Create(user, branch, request.UserName, request.UserCode, request.Role);

            await _uow.User.AddAsync(user);
            await _uow.UserBranch.AddAsync(userBranch);
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}

