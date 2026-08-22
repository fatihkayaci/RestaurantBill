using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.DeleteTable
{
    public class DeleteHandler : IRequestHandler<DeleteTableCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public DeleteHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(DeleteTableCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _db.Tables
                .FirstOrDefaultAsync(t => t.Id == request.TableId, cancellationToken);
            if (table is null) return Result.Failure("Masa bulunamadı.");

            List<Order> activeOrders = await _db.Orders
                .Where(o => o.TableId == table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
                .ToListAsync(cancellationToken);
            table.EnsureCanBeDeleted(activeOrders);

            _db.Tables.Remove(table);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Warning,
                "TableDeleted",
                $"{actor?.FullName} {table.Name} masasını sildi.",
                nameof(Table),
                table.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
