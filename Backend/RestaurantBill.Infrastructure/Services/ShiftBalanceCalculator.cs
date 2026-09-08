using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Infrastructure.Services;

public class ShiftBalanceCalculator : IShiftBalanceCalculator
{
    private readonly IAppDbContext _db;

    public ShiftBalanceCalculator(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<decimal> CalculateExpectedClosingBalanceAsync(Shift shift, CancellationToken cancellationToken)
    {
        // Vardiya henüz kapanmadıysa (ClosedAt null) aralık "şimdiye kadar" demektir;
        // kapanmış bir vardiya için ClosedAt'ten sonrası sonraki vardiyaya ait olduğundan sayılmaz.
        DateTime rangeEnd = shift.ClosedAt ?? DateTime.UtcNow;

        List<CashTransaction> transactions = await _db.CashTransactions
            .AsNoTracking()
            .Where(t => t.CashRegisterId == shift.CashRegisterId && t.CreatedAt >= shift.OpenedAt && t.CreatedAt <= rangeEnd
                && t.Id != shift.OpeningAdjustmentTransactionId)
            .ToListAsync(cancellationToken);

        decimal balance = shift.OpeningBalance;
        foreach (var transaction in transactions)
        {
            bool isOutgoing = transaction.Type is CashTransactionType.Out or CashTransactionType.TransferOut or CashTransactionType.AdjustmentOut;
            balance += isOutgoing ? -transaction.Amount : transaction.Amount;
        }

        return balance;
    }
}
