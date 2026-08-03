using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public DeleteUserCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            User? user = await _uow.User.GetByIdAsync(request.UserId, true);
            if (user is null)
            {
                return Result.Failure("Kullanıcı bulunamadı.");
            }

            user.MarkAsDeleted();

            UserBranch? userBranch = (await _uow.UserBranch.GetAllAsync(ur => ur.UserId == request.UserId && !ur.IsDeleted, false)).FirstOrDefault();
            if (userBranch is not null)
            {
                User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
                AuditLog log = AuditLog.Create(
                    userBranch.BranchId,
                    actor?.FullName ?? string.Empty,
                    AuditLogCategory.Staff,
                    AuditLogSeverity.Warning,
                    "StaffDeleted",
                    $"{actor?.FullName} {user.FullName} kullanıcısını sildi.",
                    nameof(User),
                    user.Id);
                await _uow.AuditLog.AddAsync(log);
            }

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
