using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.CloseShift;

public class CloseShiftCommandHandler : IRequestHandler<CloseShiftCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CloseShiftCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(CloseShiftCommand request, CancellationToken cancellationToken)
    {
        Shift? shift = await _db.Shifts
            .FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null) return Result.Failure("Vardiya bulunamadı.");

        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == shift.CashRegisterId, cancellationToken);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        List<CashTransaction> transactions = await _db.CashTransactions
            .Where(t => t.CashRegisterId == shift.CashRegisterId && t.CreatedAt >= shift.OpenedAt
                && t.Id != shift.OpeningAdjustmentTransactionId)
            .ToListAsync(cancellationToken);

        decimal expectedClosingBalance = shift.OpeningBalance;
        foreach (var transaction in transactions)
        {
            bool isOutgoing = transaction.Type is CashTransactionType.Out or CashTransactionType.TransferOut or CashTransactionType.AdjustmentOut;
            expectedClosingBalance += isOutgoing ? -transaction.Amount : transaction.Amount;
        }

        shift.Close(_currentUser.UserId, expectedClosingBalance, request.CountedClosingBalance, request.Note);

        bool hasDifference = shift.Difference != 0;
        if (hasDifference)
        {
            CashTransaction adjustment = register.ApplyShiftDifference(shift.Difference!.Value, _currentUser.UserId);
            _db.CashTransactions.Add(adjustment);
        }

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLogSeverity severity = hasDifference ? AuditLogSeverity.Warning : AuditLogSeverity.Info;
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            severity,
            "ShiftClosed",
            hasDifference
                ? $"{actor?.FullName} vardiyayı kapattı. Beklenen: ₺{shift.ExpectedClosingBalance}, Sayılan: ₺{shift.CountedClosingBalance}, Fark: ₺{shift.Difference}. Kasa bakiyesi anında düzeltildi, admin incelemesi bekliyor."
                : $"{actor?.FullName} vardiyayı kapattı. Beklenen: ₺{shift.ExpectedClosingBalance}, Sayılan: ₺{shift.CountedClosingBalance}, Fark: ₺{shift.Difference}.",
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
