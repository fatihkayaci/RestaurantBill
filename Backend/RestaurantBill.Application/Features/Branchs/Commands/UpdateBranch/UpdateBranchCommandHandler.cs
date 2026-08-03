using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch
{
    public class UpdateBranchCommandHandler : IRequestHandler<UpdateBranchCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public UpdateBranchCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateBranchCommand request, CancellationToken cancellationToken)
        {
            Branch? branch = await _uow.Branch.GetByIdAsync(request.RestaurantId, true, b => b.Company);
            if (branch is null || branch.Company.OwnerUserId != _currentUser.UserId)
                return Result.Failure("Şube bulunamadı.");

            branch.Update(request.Name, request.ManagerName, request.PhoneNumber, request.Email, request.City, request.District, request.OpenAddress);

            User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
            AuditLog log = AuditLog.Create(
                branch.Id,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "BranchUpdated",
                $"{actor?.FullName} {branch.BranchName} şubesini güncelledi.",
                nameof(Branch),
                branch.Id);
            await _uow.AuditLog.AddAsync(log);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
