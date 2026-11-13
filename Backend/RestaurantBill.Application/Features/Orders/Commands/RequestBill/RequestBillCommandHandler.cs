using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.RequestBill;

// Ayrı bir yetki istemez: masaya (bölgesine) erişebilen her garson hesabı isteyebilir. Ödeme yetkisi
// olmayan garsonun ana butonu budur; istek kasiyer ve yöneticilere canlı bildirim olarak düşer.
public class RequestBillCommandHandler : IRequestHandler<RequestBillCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ITableNotificationService _tableNotifications;
    private readonly ICashierNotificationService _cashierNotifications;
    private readonly ICurrentUserService _currentUser;

    public RequestBillCommandHandler(IAppDbContext db, ITableNotificationService tableNotifications, ICashierNotificationService cashierNotifications, ICurrentUserService currentUser)
    {
        _db = db;
        _tableNotifications = tableNotifications;
        _cashierNotifications = cashierNotifications;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(RequestBillCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        Order? order = await _db.Orders
            .Include(o => o.Table).ThenInclude(t => t.Region)
            .InBranches(branchIds)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
        if (order is null || order.IsClosed())
            return Result.Failure("Bu masada açık bir sipariş yok.");

        string? accessError = await _db.CheckTableAccessAsync(_currentUser, order.TableId, null, cancellationToken);
        if (accessError is not null)
            return Result.Failure(accessError);

        if (request.Cancel)
            order.ClearBillRequest();
        else
            order.RequestBill(DateTime.UtcNow);

        User? actor = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        string actorName = actor?.FullName ?? string.Empty;
        Guid branchId = order.Table.Region.BranchId;

        _db.AuditLogs.Add(AuditLog.Create(
            branchId,
            actorName,
            AuditLogCategory.Order,
            AuditLogSeverity.Info,
            request.Cancel ? "BillRequestCancelled" : "BillRequested",
            request.Cancel
                ? $"{actorName} {order.Table.Name} için hesap isteğini geri aldı."
                : $"{actorName} {order.Table.Name} için hesap istedi.",
            nameof(Order),
            order.Id));

        await _db.SaveChangesAsync(cancellationToken);

        await _tableNotifications.SendBillRequestChangedAsync(branchId, order.TableId, order.BillRequestedAt);
        await _cashierNotifications.SendOrdersChangedAsync(branchId);
        if (!request.Cancel)
            await _cashierNotifications.SendBillRequestedAsync(branchId, order.TableId, order.Table.Name, actorName);

        return Result.Success();
    }
}
