using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
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

            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

            // Silinmiş satırlar da yüklenir: çok şubeli Admin'de şubeye yeniden atama silinen üyeliği geri açar.
            List<UserBranch> allMemberships = await _db.UserBranches
                .Include(ur => ur.Branch)
                .Where(ur => ur.UserId == request.UserId)
                .OrderBy(ur => ur.CreatedAt)
                .ToListAsync(cancellationToken);
            List<UserBranch> memberships = allMemberships.Where(ur => !ur.IsDeleted).ToList();
            UserBranch? userBranch = memberships.FirstOrDefault(ur => ur.BranchId == _currentUser.BranchId) ?? memberships.FirstOrDefault();
            if (userBranch is null)
            {
                // Şubesi olmayan tek kullanıcı tipi Owner'dır ve yalnızca kendi hesabını güncelleyebilir.
                if (request.UserId != _currentUser.UserId) return Result.Failure("Kullanıcı bulunamadı.");

                bool isOwner = await _db.Companies
                    .AnyAsync(c => c.OwnerUserId == request.UserId && !c.IsDeleted, cancellationToken);
                if (!isOwner) return Result.Failure("Kullanıcı bulunamadı.");
            }
            else
            {
                if (!branchIds.Contains(userBranch.BranchId)) return Result.Failure("Kullanıcı bulunamadı.");
                if (request.Role == UserRole.Owner) return Result.Failure("Personele Owner rolü atanamaz.");
                if (userBranch.Role == UserRole.Admin && request.UserId != _currentUser.UserId && _currentUser.Role != nameof(UserRole.Owner))
                    return Result.Failure("Admin kullanıcıları yalnızca Owner düzenleyebilir.");
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

            if (userBranch is not null && request.BranchIds is not null && companyId.HasValue)
            {
                Result syncResult = await SyncMembershipsAsync(user, userBranch, allMemberships, memberships, companyId.Value, request, cancellationToken);
                if (!syncResult.IsSuccess) return syncResult;
            }
            else if (userBranch is not null && request.BranchId.HasValue && request.BranchId.Value != userBranch.BranchId)
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
            // Kullanıcı adı, kod ve rol şirket genelinde tektir; çok şubeli Admin'in her üyeliği birlikte güncellenir.
            foreach (UserBranch membership in memberships)
            {
                membership.Update(request.UserName, request.UserCode, request.Role);
                if (request.HireDate.HasValue)
                    membership.SetHireDate(request.HireDate.Value);
            }

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

        // Admin'in şube listesini istenen kümeyle eşitler: fazlası silinir, eksiği açılır (silinmişse geri açılır).
        private async Task<Result> SyncMembershipsAsync(
            User user, UserBranch primary, List<UserBranch> allMemberships, List<UserBranch> memberships,
            Guid companyId, UpdateUserCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.Role != nameof(UserRole.Owner))
                return Result.Failure("Şube atamalarını yalnızca Owner değiştirebilir.");

            List<Guid> target = request.BranchIds!.Distinct().ToList();
            if (target.Count == 0)
                return Result.Failure("En az bir şube seçilmelidir.");
            if (target.Count > 1 && request.Role != UserRole.Admin)
                return Result.Failure("Birden fazla şube yalnızca Admin için seçilebilir.");

            List<Branch> targetBranches = await _db.Branches
                .Where(b => target.Contains(b.Id) && b.CompanyId == companyId && b.Company.OwnerUserId == _currentUser.UserId && !b.IsDeleted)
                .ToListAsync(cancellationToken);
            if (targetBranches.Count != target.Count)
                return Result.Failure("Şube bulunamadı.");

            foreach (UserBranch removed in memberships.Where(m => !target.Contains(m.BranchId)).ToList())
            {
                removed.MarkAsDeleted();
                memberships.Remove(removed);
            }

            foreach (Branch branch in targetBranches.Where(b => memberships.All(m => m.BranchId != b.Id)))
            {
                UserBranch? deleted = allMemberships.FirstOrDefault(m => m.BranchId == branch.Id && m.IsDeleted);
                if (deleted is not null)
                {
                    deleted.Restore();
                    memberships.Add(deleted);
                    continue;
                }

                UserBranch added = UserBranch.Create(user, branch, request.UserName, request.UserCode, request.Role);
                added.SetHireDate(request.HireDate ?? primary.HireDate ?? DateTime.UtcNow);
                _db.UserBranches.Add(added);
                memberships.Add(added);
            }

            return Result.Success();
        }
    }
}
