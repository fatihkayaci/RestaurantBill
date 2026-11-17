using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftSummary;

public class GetShiftSummaryQueryHandler : IRequestHandler<GetShiftSummaryQuery, Result<ShiftSummaryDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IShiftBalanceCalculator _balanceCalculator;

    public GetShiftSummaryQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IShiftBalanceCalculator balanceCalculator)
    {
        _db = db;
        _currentUser = currentUser;
        _balanceCalculator = balanceCalculator;
    }

    public async Task<Result<ShiftSummaryDto>> Handle(GetShiftSummaryQuery request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        Shift? shift = await _db.Shifts
            .AsNoTracking()
            .InBranches(branchIds).FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null) return Result<ShiftSummaryDto>.Failure("Vardiya bulunamadı.");

        // Kapanmış bir vardiyayı görüntülerken sonraki vardiyanın işlemlerinin sızmaması için
        // aralık ClosedAt'te (yoksa şimdiki zamanda) kapatılır.
        DateTime rangeEnd = shift.ClosedAt ?? DateTime.UtcNow;

        List<Payment> payments = await _db.Payments
            .AsNoTracking()
            .Include(p => p.Order)
            .Where(p => p.CashRegisterId == shift.CashRegisterId
                && (p.ShiftId == shift.Id
                    || (p.ShiftId == null && p.CreatedAt >= shift.OpenedAt && p.CreatedAt <= rangeEnd)))
            .ToListAsync(cancellationToken);

        var breakdown = payments
            .GroupBy(p => p.PaymentMethod)
            .Select(g => new ShiftPaymentBreakdownDto
            {
                Method = g.Key,
                Count = g.Count(),
                Amount = g.Sum(p => p.TotalAmount)
            })
            .ToList();

        List<Order> openOrders = await _db.Orders
            .AsNoTracking()
            .Where(o => o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled && o.BranchId == shift.BranchId)
            .ToListAsync(cancellationToken);
        int openTablesCount = openOrders.Where(o => o.TableId != null).Select(o => o.TableId).Distinct().Count();

        // Bir masayı kapatmak, KDV oranına göre birden fazla Payment satırı oluşturabiliyor;
        // "tamamlanan" sayısı masa/sipariş kapatma olayını saymalı, ham Payment satırını değil.
        int completedOrdersCount = payments
            .Where(p => p.Order.Status == OrderStatus.Paid)
            .Select(p => p.OrderId)
            .Distinct()
            .Count();

        decimal expectedCashInRegister = await _balanceCalculator.CalculateExpectedClosingBalanceAsync(shift, cancellationToken);

        // Kuryede kalan tahsilat: teslim edilmiş ama kasiyerin "Teslim al"ıyla kasaya geçmemiş siparişler.
        var unsettled = await _db.DeliveryOrders
            .AsNoTracking()
            .Where(d => d.BranchId == shift.BranchId && !d.IsDeleted && d.Status == DeliveryOrderStatus.Delivered
                && d.SettledAt == null && d.CourierUserId != null && d.CollectedMethod != null)
            .Select(d => new { CourierId = d.CourierUserId!.Value, Method = d.CollectedMethod!.Value, Amount = d.CollectedAmount ?? 0m })
            .ToListAsync(cancellationToken);
        List<Guid> courierIds = unsettled.Select(u => u.CourierId).Distinct().ToList();
        Dictionary<Guid, string> courierNames = await _db.Users
            .AsNoTracking()
            .Where(u => courierIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);
        List<ShiftCourierCashDto> couriers = unsettled
            .GroupBy(u => u.CourierId)
            .Select(g => new ShiftCourierCashDto
            {
                CourierUserId = g.Key,
                FullName = courierNames.GetValueOrDefault(g.Key, string.Empty),
                Cash = g.Where(u => u.Method == PaymentMethod.Nakit).Sum(u => u.Amount),
                CashOrderCount = g.Count(u => u.Method == PaymentMethod.Nakit),
                Card = g.Where(u => u.Method != PaymentMethod.Nakit).Sum(u => u.Amount),
                CardOrderCount = g.Count(u => u.Method != PaymentMethod.Nakit)
            })
            .OrderByDescending(c => c.Cash).ThenBy(c => c.FullName)
            .ToList();

        return Result<ShiftSummaryDto>.Success(new ShiftSummaryDto
        {
            ShiftId = shift.Id,
            OpenedAt = shift.OpenedAt,
            TransactionCount = completedOrdersCount,
            Breakdown = breakdown,
            Total = payments.Sum(p => p.TotalAmount),
            ExpectedCashInRegister = _currentUser.CanSeeExpectedBalance() ? expectedCashInRegister : null,
            OpenTablesCount = openTablesCount,
            CouriersWithUnsettledCash = couriers
        });
    }
}
