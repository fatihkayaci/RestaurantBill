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
            if (request.Role == UserRole.Owner)
                return Result.Failure("Personele Owner rolü atanamaz.");

            if (request.Role == UserRole.Admin && _currentUser.Role != nameof(UserRole.Owner))
                return Result.Failure("Admin rolü atama yetkiniz yok.");

            List<Guid> requestedBranchIds = (request.BranchIds ?? [])
                .Prepend(request.BranchId ?? Guid.Empty)
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToList();

            if (requestedBranchIds.Count > 1 && request.Role != UserRole.Admin)
                return Result.Failure("Birden fazla şube yalnızca Admin için seçilebilir.");

            Guid restaurantId = requestedBranchIds.Count > 0 ? requestedBranchIds[0] : _currentUser.BranchId;

            if (requestedBranchIds.Any(id => id != _currentUser.BranchId))
            {
                if (_currentUser.Role != nameof(UserRole.Owner))
                    return Result.Failure("Bu şubeye kullanıcı ekleme yetkiniz yok.");

                int ownedCount = await _db.Branches
                    .CountAsync(b => requestedBranchIds.Contains(b.Id) && b.Company.OwnerUserId == _currentUser.UserId && !b.IsDeleted, cancellationToken);
                if (ownedCount != requestedBranchIds.Count)
                    return Result.Failure("Şube bulunamadı.");
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

            // Çok şubeli Admin: aynı kullanıcı adı ve kodla her ek şubeye bir üyelik daha açılır.
            List<Guid> extraBranchIds = requestedBranchIds.Where(id => id != restaurantId).ToList();
            if (extraBranchIds.Count > 0)
            {
                List<Branch> extraBranches = await _db.Branches
                    .Where(b => extraBranchIds.Contains(b.Id) && b.CompanyId == branch.CompanyId)
                    .ToListAsync(cancellationToken);
                if (extraBranches.Count != extraBranchIds.Count)
                    return Result.Failure("Şube bulunamadı.");

                foreach (Branch extra in extraBranches)
                {
                    UserBranch extraMembership = UserBranch.Create(user, extra, request.UserName, request.UserCode, request.Role);
                    extraMembership.SetHireDate(request.HireDate ?? DateTime.UtcNow);
                    _db.UserBranches.Add(extraMembership);
                }
            }

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
