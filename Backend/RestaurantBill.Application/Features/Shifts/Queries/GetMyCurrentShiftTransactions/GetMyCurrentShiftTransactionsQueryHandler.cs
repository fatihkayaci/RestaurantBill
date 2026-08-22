using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShiftTransactions;

public class GetMyCurrentShiftTransactionsQueryHandler : IRequestHandler<GetMyCurrentShiftTransactionsQuery, Result<List<ShiftTransactionDto>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetMyCurrentShiftTransactionsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ShiftTransactionDto>>> Handle(GetMyCurrentShiftTransactionsQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;

        Shift? shift = await _db.Shifts
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.BranchId == restaurantId && s.OpenedByUserId == _currentUser.UserId && s.Status == ShiftStatus.Open, cancellationToken);
        if (shift is null) return Result<List<ShiftTransactionDto>>.Failure("Açık bir vardiyanız yok.");

        List<Payment> payments = await _db.Payments
            .AsNoTracking()
            .Include(p => p.Order).ThenInclude(o => o!.Table)
            .Where(p => p.CashRegisterId == shift.CashRegisterId && p.CreatedAt >= shift.OpenedAt)
            .ToListAsync(cancellationToken);

        List<Guid> creatorIds = payments.Select(p => p.Order.CreatedUser).Distinct().ToList();
        Dictionary<Guid, string> creatorNameById = await _db.Users
            .AsNoTracking()
            .Where(u => creatorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        // One Payment row is created per tax rate per checkout, and an order can be paid off
        // across multiple partial checkouts too — group everything by order so the cashier
        // sees a single line per table's bill. Details holds one entry per checkout action
        // (re-grouped by method + moment) so the UI can expand into "who paid how" later.
        var result = payments
            .GroupBy(p => p.OrderId)
            .Select(g =>
            {
                var latest = g.OrderByDescending(p => p.CreatedAt).First();

                var details = g
                    .GroupBy(p => (p.PaymentMethod, Bucket: p.CreatedAt.Ticks / TimeSpan.TicksPerSecond))
                    .Select(dg => new ShiftTransactionDetailDto
                    {
                        CreatedAt = dg.Min(p => p.CreatedAt),
                        Method = dg.Key.PaymentMethod,
                        Amount = dg.Sum(p => p.TotalAmount),
                        TaxAmount = dg.Sum(p => p.TaxAmount),
                        ItemCount = dg.Sum(p => p.ItemCount)
                    })
                    .OrderBy(d => d.CreatedAt)
                    .ToList();

                return new ShiftTransactionDto
                {
                    Id = latest.Id,
                    CreatedAt = g.Max(p => p.CreatedAt),
                    Method = latest.PaymentMethod,
                    Amount = g.Sum(p => p.TotalAmount),
                    TaxAmount = g.Sum(p => p.TaxAmount),
                    ItemCount = g.Sum(p => p.ItemCount),
                    TableName = latest.Order?.Table?.Name ?? string.Empty,
                    CreatedByUserName = creatorNameById.GetValueOrDefault(latest.Order?.CreatedUser ?? Guid.Empty, string.Empty),
                    Details = details
                };
            })
            .OrderByDescending(t => t.CreatedAt)
            .ToList();

        return Result<List<ShiftTransactionDto>>.Success(result);
    }
}
