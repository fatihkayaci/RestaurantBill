using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShiftTransactions;

public class GetMyCurrentShiftTransactionsQueryHandler : IRequestHandler<GetMyCurrentShiftTransactionsQuery, Result<List<ShiftTransactionDto>>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetMyCurrentShiftTransactionsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ShiftTransactionDto>>> Handle(GetMyCurrentShiftTransactionsQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;

        var openShifts = await _uow.Shift.GetAllAsync(
            s => s.BranchId == restaurantId && s.OpenedByUserId == _currentUser.UserId && s.Status == ShiftStatus.Open);
        var shift = openShifts.FirstOrDefault();
        if (shift is null) return Result<List<ShiftTransactionDto>>.Failure("Açık bir vardiyanız yok.");

        var payments = await _uow.Payment.GetAllAsync(
            p => p.CashRegisterId == shift.CashRegisterId && p.CreatedAt >= shift.OpenedAt,
            false,
            "Order,Order.Table");

        var creatorIds = payments.Select(p => p.Order.CreatedUser).Distinct().ToList();
        var creators = await _uow.User.GetAllAsync(u => creatorIds.Contains(u.Id));
        var creatorNameById = creators.ToDictionary(u => u.Id, u => u.FullName);

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
