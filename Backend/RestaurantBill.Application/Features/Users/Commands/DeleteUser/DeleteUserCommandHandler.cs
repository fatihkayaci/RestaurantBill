using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public DeleteUserCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            if (request.UserId == _currentUser.UserId)
                return Result.Failure("Kendi hesabınızı silemezsiniz.");

            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

            // Şubesi olmayan kullanıcılar (Owner) bu uçtan silinemez; personel yalnızca erişilebilir şubelerden silinir.
            UserBranch? userBranch = await _db.UserBranches
                .InBranches(branchIds)
                .FirstOrDefaultAsync(ur => ur.UserId == request.UserId && !ur.IsDeleted, cancellationToken);
            if (userBranch is null)
                return Result.Failure("Kullanıcı bulunamadı.");

            if (userBranch.Role == UserRole.Admin && _currentUser.Role != nameof(UserRole.Owner))
                return Result.Failure("Admin kullanıcıları yalnızca Owner silebilir.");

            User? user = await _db.Users
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (user is null)
            {
                return Result.Failure("Kullanıcı bulunamadı.");
            }

            user.MarkAsDeleted();

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                userBranch.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Staff,
                AuditLogSeverity.Warning,
                "StaffDeleted",
                $"{actor?.FullName} {user.FullName} kullanıcısını sildi.",
                nameof(User),
                user.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
