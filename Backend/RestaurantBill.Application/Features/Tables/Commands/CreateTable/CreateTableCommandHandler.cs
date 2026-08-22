using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable
{
    public class CreateTableCommandHandler : IRequestHandler<CreateTableCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public CreateTableCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(CreateTableCommand request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;

            bool nameExistsInRegion = await _db.Tables
                .AnyAsync(t => t.Name == request.Name && t.RegionId == request.RegionId && t.Region.BranchId == restaurantId, cancellationToken);
            if (nameExistsInRegion)
                return Result.Failure("Bu bölgede bu isimde bir masa zaten mevcut.");

            Table table = Table.Create(request.Name, string.Empty, request.RegionId);
            table.AssignRegion(request.RegionId);
            _db.Tables.Add(table);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                restaurantId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "TableCreated",
                $"{actor?.FullName} {table.Name} adında yeni bir masa ekledi.",
                nameof(Table),
                table.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
