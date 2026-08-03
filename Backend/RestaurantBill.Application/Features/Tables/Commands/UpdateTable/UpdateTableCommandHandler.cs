using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.UpdateTable
{
    public class UpdateCommandHandler : IRequestHandler<UpdateTableCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public UpdateCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateTableCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.Id, true);
            if (table is null) return Result.Failure("Böyle bir masa bulunamadı");

            table.Update(request.Name, table.Note);
            table.AssignRegion(request.RegionId);
            if (request.Status.HasValue)
                table.SetStatus(request.Status.Value);

            await _uow.Table.UpdateAsync(table);

            User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "TableUpdated",
                $"{actor?.FullName} {table.Name} masasını güncelledi.",
                nameof(Table),
                table.Id);
            await _uow.AuditLog.AddAsync(log);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
