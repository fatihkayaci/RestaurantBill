using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.CloseShiftWithoutCount;

public class CloseShiftWithoutCountCommandHandler : IRequestHandler<CloseShiftWithoutCountCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IShiftBalanceCalculator _balanceCalculator;

    public CloseShiftWithoutCountCommandHandler(IAppDbContext db, ICurrentUserService currentUser, IShiftBalanceCalculator balanceCalculator)
    {
        _db = db;
        _currentUser = currentUser;
        _balanceCalculator = balanceCalculator;
    }

    public async Task<Result> Handle(CloseShiftWithoutCountCommand request, CancellationToken cancellationToken)
    {
        Shift? shift = await _db.Shifts
            .FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null) return Result.Failure("Vardiya bulunamadı.");

        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == shift.CashRegisterId, cancellationToken);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        decimal expectedClosingBalance = await _balanceCalculator.CalculateExpectedClosingBalanceAsync(shift, cancellationToken);
        shift.CloseWithoutCount(_currentUser.UserId, expectedClosingBalance, bySystem: false);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "ShiftClosedWithoutCount",
            $"{actor?.FullName} {register.Name} kasasındaki günü sayım yapmadan kapattı. Beklenen: ₺{expectedClosingBalance}. Sayım sonradan girilebilir.",
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
