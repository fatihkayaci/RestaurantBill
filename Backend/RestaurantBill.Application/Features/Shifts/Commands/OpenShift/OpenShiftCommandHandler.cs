using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.OpenShift;

public class OpenShiftCommandHandler : IRequestHandler<OpenShiftCommand, Result>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public OpenShiftCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(OpenShiftCommand request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;

        CashRegister? register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        if (register.Status != CashRegisterStatus.Open)
            return Result.Failure("Kapalı bir kasada vardiya açılamaz.");

        var existingShifts = await _uow.Shift.GetAllAsync(s => s.CashRegisterId == request.CashRegisterId);
        if (existingShifts.Any(s => s.Status == ShiftStatus.Open))
            return Result.Failure("Bu kasada zaten açık bir vardiya var.");

        decimal expectedOpeningBalance = register.Balance;

        Shift shift = Shift.Create(restaurantId, request.CashRegisterId, _currentUser.UserId, expectedOpeningBalance, request.OpeningBalance);
        await _uow.Shift.AddAsync(shift);

        User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
        bool hasDifference = shift.OpeningDifference != 0;
        AuditLog log = AuditLog.Create(
            restaurantId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            hasDifference ? AuditLogSeverity.Warning : AuditLogSeverity.Info,
            "ShiftOpened",
            hasDifference
                ? $"{actor?.FullName} {register.Name} kasasında ₺{request.OpeningBalance} açılış bakiyesiyle vardiya açtı. Beklenen ₺{expectedOpeningBalance} idi, ₺{shift.OpeningDifference} fark var."
                : $"{actor?.FullName} {register.Name} kasasında ₺{request.OpeningBalance} açılış bakiyesiyle vardiya açtı.",
            nameof(Shift),
            shift.Id);
        await _uow.AuditLog.AddAsync(log);

        await _uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
