using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly ICurrentUserService _currentUser;

        public CreateUserCommandHandler(IAppDbContext db, IPasswordHasher<User> passwordHasher, ICurrentUserService currentUser)
        {
            _db = db;
            _passwordHasher = passwordHasher;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            if (request.Role == UserRole.Admin && _currentUser.Role != nameof(UserRole.Owner))
                return Result.Failure("Admin rolü atama yetkiniz yok.");

            Guid restaurantId = _currentUser.BranchId;

            if (request.BranchId.HasValue && request.BranchId.Value != restaurantId)
            {
                if (_currentUser.Role != nameof(UserRole.Owner))
                    return Result.Failure("Bu şubeye kullanıcı ekleme yetkiniz yok.");

                bool ownsRestaurant = await _db.Branches
                    .AnyAsync(b => b.Id == request.BranchId.Value && b.Company.OwnerUserId == _currentUser.UserId && !b.IsDeleted, cancellationToken);
                if (!ownsRestaurant)
                    return Result.Failure("Şube bulunamadı.");

                restaurantId = request.BranchId.Value;
            }

            Branch? branch = await _db.Branches
                .FirstOrDefaultAsync(b => b.Id == restaurantId, cancellationToken);
            if (branch is null)
                return Result.Failure("Restoran bulunamadı.");

            bool userNameExists = await _db.UserBranches
                .AnyAsync(ur => ur.UserName == request.UserName && ur.Branch.CompanyId == branch.CompanyId && !ur.IsDeleted, cancellationToken);
            if (userNameExists)
                return Result.Failure("Bu kullanıcı adı zaten kullanımda.");

            if (!string.IsNullOrWhiteSpace(request.UserCode))
            {
                bool userCodeExists = await _db.UserBranches
                    .AnyAsync(ur => ur.UserCode == request.UserCode && ur.Branch.CompanyId == branch.CompanyId && !ur.IsDeleted, cancellationToken);
                if (userCodeExists)
                    return Result.Failure("Bu kullanıcı kodu zaten kullanımda.");
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                bool emailExists = await _db.Users
                    .AnyAsync(u => u.Email == request.Email && !u.IsDeleted, cancellationToken);
                if (emailExists)
                    return Result.Failure("Bu e-posta adresi zaten kullanımda.");
            }

            User user = User.Create(request.FullName, request.Email ?? string.Empty, request.PhoneNumber ?? string.Empty);
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.PasswordHash));
            UserBranch userBranch = UserBranch.Create(user, branch, request.UserName, request.UserCode, request.Role);
            userBranch.SetHireDate(request.HireDate ?? DateTime.UtcNow);

            _db.Users.Add(user);
            _db.UserBranches.Add(userBranch);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                restaurantId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Staff,
                AuditLogSeverity.Info,
                "StaffCreated",
                $"{actor?.FullName} {user.FullName} adında yeni bir {request.Role} ekledi.",
                nameof(User),
                user.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
