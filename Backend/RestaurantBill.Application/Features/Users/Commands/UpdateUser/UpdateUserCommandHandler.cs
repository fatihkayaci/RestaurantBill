using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser
{
    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly ICurrentUserService _currentUser;

        public UpdateUserCommandHandler(IAppDbContext db, IPasswordHasher<User> passwordHasher, ICurrentUserService currentUser)
        {
            _db = db;
            _passwordHasher = passwordHasher;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            User? user = await _db.Users
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (user is null) return Result.Failure("Kullanıcı bulunamadı.");

            UserBranch? userBranch = await _db.UserBranches
                .Include(ur => ur.Branch)
                .FirstOrDefaultAsync(ur => ur.UserId == request.UserId && !ur.IsDeleted, cancellationToken);
            if (userBranch is null)
            {
                bool isOwner = await _db.Companies
                    .AnyAsync(c => c.OwnerUserId == request.UserId && !c.IsDeleted, cancellationToken);
                if (!isOwner) return Result.Failure("Kullanıcı bulunamadı.");
            }

            bool isPromotingToAdmin = request.Role == UserRole.Admin && userBranch?.Role != UserRole.Admin;
            if (isPromotingToAdmin && _currentUser.Role != nameof(UserRole.Owner))
                return Result.Failure("Admin rolü atama yetkiniz yok.");

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                bool emailExists = await _db.Users
                    .AnyAsync(u => u.Email == request.Email && u.Id != request.UserId && !u.IsDeleted, cancellationToken);
                if (emailExists)
                    return Result.Failure("Bu e-posta adresi zaten kullanımda.");
            }

            Guid? companyId = userBranch?.Branch.CompanyId;

            if (userBranch is not null && request.BranchId.HasValue && request.BranchId.Value != userBranch.BranchId)
            {
                if (_currentUser.Role != nameof(UserRole.Owner))
                    return Result.Failure("Bu şubeye kullanıcı taşıma yetkiniz yok.");

                Branch? targetBranch = await _db.Branches
                    .FirstOrDefaultAsync(b => b.Id == request.BranchId.Value && b.Company.OwnerUserId == _currentUser.UserId && !b.IsDeleted, cancellationToken);
                if (targetBranch is null)
                    return Result.Failure("Şube bulunamadı.");

                companyId = targetBranch.CompanyId;
                userBranch.ChangeBranch(targetBranch);
            }

            if (userBranch is not null && companyId.HasValue)
            {
                bool userNameExists = await _db.UserBranches
                    .AnyAsync(ur => ur.UserName == request.UserName && ur.Branch.CompanyId == companyId.Value && ur.UserId != request.UserId && !ur.IsDeleted, cancellationToken);
                if (userNameExists)
                    return Result.Failure("Bu kullanıcı adı zaten kullanımda.");

                if (!string.IsNullOrWhiteSpace(request.UserCode))
                {
                    bool userCodeExists = await _db.UserBranches
                        .AnyAsync(ur => ur.UserCode == request.UserCode && ur.Branch.CompanyId == companyId.Value && ur.UserId != request.UserId && !ur.IsDeleted, cancellationToken);
                    if (userCodeExists)
                        return Result.Failure("Bu kullanıcı kodu zaten kullanımda.");
                }
            }

            user.Update(request.FullName, request.Email ?? string.Empty, request.PhoneNumber ?? string.Empty, request.IsActive ?? user.IsActive);
            userBranch?.Update(request.UserName, request.UserCode, request.Role);
            if (request.HireDate.HasValue)
                userBranch?.SetHireDate(request.HireDate.Value);

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));

            if (userBranch is not null)
            {
                User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
                AuditLog log = AuditLog.Create(
                    userBranch.BranchId,
                    actor?.FullName ?? string.Empty,
                    AuditLogCategory.Staff,
                    AuditLogSeverity.Info,
                    "StaffUpdated",
                    $"{actor?.FullName} {user.FullName} bilgilerini güncelledi.",
                    nameof(User),
                    user.Id);
                _db.AuditLogs.Add(log);
            }

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
