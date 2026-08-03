using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable
{
    public class CreateTableCommandHandler : IRequestHandler<CreateTableCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public CreateTableCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(CreateTableCommand request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;

            bool nameExistsInRegion = (await _uow.Table.GetAllAsync(t => t.Name == request.Name && t.RegionId == request.RegionId && t.Region.BranchId == restaurantId, false)).Any();
            if (nameExistsInRegion)
                return Result.Failure("Bu bölgede bu isimde bir masa zaten mevcut.");

            Table table = Table.Create(request.Name, string.Empty, request.RegionId);
            table.AssignRegion(request.RegionId);
            await _uow.Table.AddAsync(table);

            User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
            AuditLog log = AuditLog.Create(
                restaurantId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "TableCreated",
                $"{actor?.FullName} {table.Name} adında yeni bir masa ekledi.",
                nameof(Table),
                table.Id);
            await _uow.AuditLog.AddAsync(log);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
