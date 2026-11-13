using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.TransferOrder;

public class TransferOrderCommandHandler : IRequestHandler<TransferOrderCommand, Result<bool>>
{
    private readonly IAppDbContext _db;
    private readonly OrderQueries _orderQueries;
    private readonly ITableNotificationService _tableNotificationService;
    private readonly ICashierNotificationService _cashierNotificationService;
    private readonly ICurrentUserService _currentUserService;

    public TransferOrderCommandHandler(IAppDbContext db, OrderQueries orderQueries, ITableNotificationService tableNotificationService,
        ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
    {
        _db = db;
        _orderQueries = orderQueries;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(TransferOrderCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

        Table? source = await _db.Tables.InBranches(branchIds).FirstOrDefaultAsync(t => t.Id == request.SourceTableId, cancellationToken);
        if (source is null)
            return Result<bool>.Failure("Kaynak masa bulunamadı.");

        Table? destination = await _db.Tables.InBranches(branchIds).FirstOrDefaultAsync(t => t.Id == request.DestinationTableId, cancellationToken);
        if (destination is null)
            return Result<bool>.Failure("Hedef masa bulunamadı.");

        StaffAccess access = await _db.GetStaffAccessAsync(_currentUserService, cancellationToken);
        string? accessError = await _db.CheckTableAccessAsync(access, source.Id, WaiterPermission.TransferAndReserve, cancellationToken)
            ?? await _db.CheckTableAccessAsync(access, destination.Id, null, cancellationToken);
        if (accessError is not null)
            return Result<bool>.Failure(accessError);

        List<Guid> tableBranchIds = await _db.Regions
            .Where(r => r.Id == source.RegionId || r.Id == destination.RegionId)
            .Select(r => r.BranchId)
            .Distinct()
            .ToListAsync(cancellationToken);
        if (tableBranchIds.Count != 1)
            return Result<bool>.Failure("Masalar farklı şubelere ait.");

        Order? sourceOrder = await _orderQueries.GetActiveOrderByTableIdAsync(source.Id, trackChanges: true, cancellationToken);
        if (sourceOrder is null)
            return Result<bool>.Failure("Kaynak masada aktif bir sipariş yok.");

        Order? mergedOrClosedOrder = null;
        Order? swapTarget = null;

        switch (request.Mode)
        {
            case TableTransferMode.Move:
                if (destination.Status != TableStatus.Available)
                    return Result<bool>.Failure("Hedef masa boş değil.");

                sourceOrder.MoveToTable(destination.Id);
                destination.Occupy();
                source.Release();
                break;

            case TableTransferMode.Merge:
            {
                if (destination.Status != TableStatus.Occupied)
                    return Result<bool>.Failure("Hedef masa dolu değil.");

                Order? mergeTarget = await _orderQueries.GetActiveOrderByTableIdAsync(destination.Id, trackChanges: true, cancellationToken);
                if (mergeTarget is null)
                    return Result<bool>.Failure("Hedef masada aktif bir sipariş yok.");

                // Kaynak hesaptan tutar girerek alınmış ödemeler birleşen hesaba taşınır (kapanışta mahsup edilir).
                if (sourceOrder.PaidOnAccount > 0)
                {
                    List<Payment> onAccountPayments = await _db.Payments
                        .Where(p => p.OrderId == sourceOrder.Id && p.IsOnAccount)
                        .ToListAsync(cancellationToken);
                    foreach (Payment payment in onAccountPayments)
                        payment.MoveToOrder(mergeTarget.Id);
                }

                mergeTarget.MergeFrom(sourceOrder);
                sourceOrder.Cancel();
                source.Release();
                mergedOrClosedOrder = mergeTarget;
                break;
            }

            case TableTransferMode.Swap:
            {
                if (destination.Status != TableStatus.Occupied)
                    return Result<bool>.Failure("Hedef masa dolu değil.");

                swapTarget = await _orderQueries.GetActiveOrderByTableIdAsync(destination.Id, trackChanges: true, cancellationToken);
                if (swapTarget is null)
                    return Result<bool>.Failure("Hedef masada aktif bir sipariş yok.");

                sourceOrder.MoveToTable(destination.Id);
                swapTarget.MoveToTable(source.Id);
                break;
            }

            default:
                return Result<bool>.Failure("Geçersiz işlem.");
        }

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId, cancellationToken);
        string message = request.Mode switch
        {
            TableTransferMode.Move => $"{actor?.FullName} {source.Name} masasındaki siparişi {destination.Name} masasına taşıdı.",
            TableTransferMode.Merge => $"{actor?.FullName} {source.Name} masasındaki siparişi {destination.Name} masasıyla birleştirdi.",
            TableTransferMode.Swap => $"{actor?.FullName} {source.Name} ve {destination.Name} masalarının siparişlerini değiştirdi.",
            _ => string.Empty
        };
        AuditLog log = AuditLog.Create(
            _currentUserService.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Order,
            AuditLogSeverity.Info,
            "OrderTransferred",
            message,
            nameof(Order),
            sourceOrder.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);

        switch (request.Mode)
        {
            case TableTransferMode.Move:
                await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, source.Id, (int)source.Status);
                await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, destination.Id, (int)destination.Status);
                await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, destination.Id, sourceOrder.TotalPrice, actor?.FullName ?? string.Empty);
                break;

            case TableTransferMode.Merge:
                await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, source.Id, (int)source.Status);
                await _tableNotificationService.SendOrderClosedAsync(_currentUserService.BranchId, source.Id, sourceOrder.Id);
                await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, destination.Id, mergedOrClosedOrder!.TotalPrice, actor?.FullName ?? string.Empty);
                break;

            case TableTransferMode.Swap:
                await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, source.Id, swapTarget!.TotalPrice, actor?.FullName ?? string.Empty);
                await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, destination.Id, sourceOrder.TotalPrice, actor?.FullName ?? string.Empty);
                break;
        }

        // "Hesap istendi" siparişle birlikte yer değiştirir; masa ekranlarındaki rozet buna göre güncellenir.
        (DateTime? sourceBill, DateTime? destinationBill) = request.Mode switch
        {
            TableTransferMode.Move => ((DateTime?)null, sourceOrder.BillRequestedAt),
            TableTransferMode.Merge => (null, mergedOrClosedOrder!.BillRequestedAt),
            _ => (swapTarget!.BillRequestedAt, sourceOrder.BillRequestedAt),
        };
        await _tableNotificationService.SendBillRequestChangedAsync(_currentUserService.BranchId, source.Id, sourceBill);
        await _tableNotificationService.SendBillRequestChangedAsync(_currentUserService.BranchId, destination.Id, destinationBill);
        await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);

        return Result<bool>.Success(true);
    }
}
