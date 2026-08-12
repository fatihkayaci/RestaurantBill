using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.RejectShiftDifference;

public class RejectShiftDifferenceCommandHandler : IRequestHandler<RejectShiftDifferenceCommand, Result>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public RejectShiftDifferenceCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(RejectShiftDifferenceCommand request, CancellationToken cancellationToken)
    {
        Shift? shift = await _uow.Shift.GetByIdAsync(request.ShiftId, true);
        if (shift is null || shift.BranchId != _currentUser.BranchId)
            return Result.Failure("Vardiya bulunamadı.");

        if (shift.Difference is null or 0)
            return Result.Failure("Bu vardiyada reddedilecek bir fark yok.");

        CashRegister? register = await _uow.CashRegister.GetByIdAsync(shift.CashRegisterId, true);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        CashTransaction reversal = register.ApplyShiftDifference(-shift.Difference.Value, _currentUser.UserId);
        await _uow.CashTransaction.AddAsync(reversal);
        await _uow.CashRegister.UpdateAsync(register);

        shift.RejectDifference(_currentUser.UserId, request.Note);
        await _uow.Shift.UpdateAsync(shift);

        User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Warning,
            "ShiftDifferenceRejected",
            $"{actor?.FullName} {register.Name} kasasındaki ₺{shift.Difference} tutarındaki vardiya kapanış farkını reddetti, kasa bakiyesi düzeltme öncesine geri alındı (yeni bakiye ₺{register.Balance})." +
                (string.IsNullOrWhiteSpace(request.Note) ? string.Empty : $" Not: {request.Note}"),
            nameof(Shift),
            shift.Id);
        await _uow.AuditLog.AddAsync(log);

        await _uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
