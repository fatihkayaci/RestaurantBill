using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftDifference;

public class ApproveShiftDifferenceCommandHandler : IRequestHandler<ApproveShiftDifferenceCommand, Result>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public ApproveShiftDifferenceCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(ApproveShiftDifferenceCommand request, CancellationToken cancellationToken)
    {
        Shift? shift = await _uow.Shift.GetByIdAsync(request.ShiftId, true);
        if (shift is null || shift.BranchId != _currentUser.BranchId)
            return Result.Failure("Vardiya bulunamadı.");

        if (shift.Difference is null or 0)
            return Result.Failure("Bu vardiyada onaylanacak bir fark yok.");

        if (shift.ClosingDifferenceApprovedAt is not null)
            return Result.Failure("Bu vardiyanın farkı zaten onaylanmış.");

        CashRegister? register = await _uow.CashRegister.GetByIdAsync(shift.CashRegisterId, true);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        CashTransaction transaction = register.ApplyShiftDifference(shift.Difference.Value, _currentUser.UserId);
        await _uow.CashTransaction.AddAsync(transaction);
        await _uow.CashRegister.UpdateAsync(register);

        shift.ApproveDifference(_currentUser.UserId);
        await _uow.Shift.UpdateAsync(shift);

        User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "ShiftDifferenceApproved",
            $"{actor?.FullName} {register.Name} kasasındaki ₺{shift.Difference} tutarındaki vardiya farkını onayladı. Kasa bakiyesi ₺{register.Balance} oldu.",
            nameof(Shift),
            shift.Id);
        await _uow.AuditLog.AddAsync(log);

        await _uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
