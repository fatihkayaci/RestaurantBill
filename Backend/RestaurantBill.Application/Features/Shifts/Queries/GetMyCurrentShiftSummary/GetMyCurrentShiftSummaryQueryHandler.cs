using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShiftSummary;

public class GetMyCurrentShiftSummaryQueryHandler : IRequestHandler<GetMyCurrentShiftSummaryQuery, Result<ShiftSummaryDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetMyCurrentShiftSummaryQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<ShiftSummaryDto>> Handle(GetMyCurrentShiftSummaryQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;

        Shift? shift = await _db.Shifts
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.BranchId == restaurantId && s.OpenedByUserId == _currentUser.UserId && s.Status == ShiftStatus.Open, cancellationToken);
        if (shift is null) return Result<ShiftSummaryDto>.Failure("Açık bir vardiyanız yok.");

        List<Payment> payments = await _db.Payments
            .AsNoTracking()
            .Include(p => p.Order)
            .Where(p => p.CashRegisterId == shift.CashRegisterId && p.CreatedAt >= shift.OpenedAt)
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
            .Where(o => o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled && o.Table.Region.BranchId == restaurantId)
            .ToListAsync(cancellationToken);
        int openTablesCount = openOrders.Select(o => o.TableId).Distinct().Count();

        // Bir masayı kapatmak, KDV oranına göre birden fazla Payment satırı oluşturabiliyor;
        // "tamamlanan" sayısı masa/sipariş kapatma olayını saymalı, ham Payment satırını değil.
        int completedOrdersCount = payments
            .Where(p => p.Order.Status == OrderStatus.Paid)
            .Select(p => p.OrderId)
            .Distinct()
            .Count();

        List<CashTransaction> transactions = await _db.CashTransactions
            .AsNoTracking()
            .Where(t => t.CashRegisterId == shift.CashRegisterId && t.CreatedAt >= shift.OpenedAt
                && t.Id != shift.OpeningAdjustmentTransactionId)
            .ToListAsync(cancellationToken);

        decimal expectedCashInRegister = shift.OpeningBalance;
        foreach (var transaction in transactions)
        {
            bool isOutgoing = transaction.Type is CashTransactionType.Out or CashTransactionType.TransferOut or CashTransactionType.AdjustmentOut;
            expectedCashInRegister += isOutgoing ? -transaction.Amount : transaction.Amount;
        }

        return Result<ShiftSummaryDto>.Success(new ShiftSummaryDto
        {
            ShiftId = shift.Id,
            OpenedAt = shift.OpenedAt,
            TransactionCount = completedOrdersCount,
            Breakdown = breakdown,
            Total = payments.Sum(p => p.TotalAmount),
            ExpectedCashInRegister = expectedCashInRegister,
            OpenTablesCount = openTablesCount
        });
    }
}
