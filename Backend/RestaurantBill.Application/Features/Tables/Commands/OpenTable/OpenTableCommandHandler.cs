using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableHandler : IRequestHandler<OpenTableCommand, Result<Guid>>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public OpenTableHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result<Guid>> Handle(OpenTableCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _db.Tables
                .FirstOrDefaultAsync(t => t.Id == request.TableId, cancellationToken);
            if (table is null) return Result<Guid>.Failure("Böyle bir masa bulunamadı.");

            table.Occupy();

            Order order = Order.Create(request.TableId);
            _db.Orders.Add(order);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUserService.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Order,
                AuditLogSeverity.Info,
                "OrderCreated",
                $"{actor?.FullName} {table.Name} için sipariş açtı.",
                nameof(Order),
                order.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
            await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);

            return Result<Guid>.Success(order.Id);
        }
    }
}
