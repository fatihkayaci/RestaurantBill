using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.CloseShift;

public class CloseShiftCommandHandler : IRequestHandler<CloseShiftCommand, Result>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CloseShiftCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(CloseShiftCommand request, CancellationToken cancellationToken)
    {
        Shift? shift = await _uow.Shift.GetByIdAsync(request.ShiftId, true);
        if (shift is null) return Result.Failure("Vardiya bulunamadı.");

        CashRegister? register = await _uow.CashRegister.GetByIdAsync(shift.CashRegisterId, true);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        var transactions = await _uow.CashTransaction.GetAllAsync(
            t => t.CashRegisterId == shift.CashRegisterId && t.CreatedAt >= shift.OpenedAt
                && t.Id != shift.OpeningAdjustmentTransactionId);

        decimal expectedClosingBalance = shift.OpeningBalance;
        foreach (var transaction in transactions)
        {
            bool isOutgoing = transaction.Type is CashTransactionType.Out or CashTransactionType.TransferOut or CashTransactionType.AdjustmentOut;
            expectedClosingBalance += isOutgoing ? -transaction.Amount : transaction.Amount;
        }

        shift.Close(_currentUser.UserId, expectedClosingBalance, request.CountedClosingBalance, request.Note);
        await _uow.Shift.UpdateAsync(shift);

        bool hasDifference = shift.Difference != 0;
        if (hasDifference)
        {
            CashTransaction adjustment = register.ApplyShiftDifference(shift.Difference!.Value, _currentUser.UserId);
            await _uow.CashTransaction.AddAsync(adjustment);
            await _uow.CashRegister.UpdateAsync(register);
        }

        User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
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
        await _uow.AuditLog.AddAsync(log);

        await _uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
