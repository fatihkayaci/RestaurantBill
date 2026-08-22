using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.OpenShift;

public class OpenShiftCommandHandler : IRequestHandler<OpenShiftCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public OpenShiftCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(OpenShiftCommand request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;

        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        if (register.Status != CashRegisterStatus.Open)
            return Result.Failure("Kapalı bir kasada vardiya açılamaz.");

        bool hasOpenShift = await _db.Shifts
            .AnyAsync(s => s.CashRegisterId == request.CashRegisterId && s.Status == ShiftStatus.Open, cancellationToken);
        if (hasOpenShift)
            return Result.Failure("Bu kasada zaten açık bir vardiya var.");

        decimal expectedOpeningBalance = register.Balance;

        Shift shift = Shift.Create(restaurantId, request.CashRegisterId, _currentUser.UserId, expectedOpeningBalance, request.OpeningBalance);
        _db.Shifts.Add(shift);

        bool hasDifference = shift.OpeningDifference != 0;
        if (hasDifference)
        {
            CashTransaction adjustment = register.ApplyShiftDifference(shift.OpeningDifference, _currentUser.UserId);
            _db.CashTransactions.Add(adjustment);
            shift.LinkOpeningAdjustmentTransaction(adjustment.Id);
        }

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            restaurantId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            hasDifference ? AuditLogSeverity.Warning : AuditLogSeverity.Info,
            "ShiftOpened",
            hasDifference
                ? $"{actor?.FullName} {register.Name} kasasında ₺{request.OpeningBalance} açılış bakiyesiyle vardiya açtı. Beklenen ₺{expectedOpeningBalance} idi, ₺{shift.OpeningDifference} fark var. Kasa bakiyesi anında düzeltildi, admin incelemesi bekliyor."
                : $"{actor?.FullName} {register.Name} kasasında ₺{request.OpeningBalance} açılış bakiyesiyle vardiya açtı.",
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
