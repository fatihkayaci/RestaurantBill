using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.RejectShiftOpeningDifference;

public class RejectShiftOpeningDifferenceCommandHandler : IRequestHandler<RejectShiftOpeningDifferenceCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public RejectShiftOpeningDifferenceCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(RejectShiftOpeningDifferenceCommand request, CancellationToken cancellationToken)
    {
        Shift? shift = await _db.Shifts
            .FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null || shift.BranchId != _currentUser.BranchId)
            return Result.Failure("Vardiya bulunamadı.");

        if (shift.OpeningDifference == 0)
            return Result.Failure("Bu vardiyada reddedilecek bir açılış farkı yok.");

        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == shift.CashRegisterId, cancellationToken);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        CashTransaction reversal = register.ApplyShiftDifference(-shift.OpeningDifference, _currentUser.UserId);
        _db.CashTransactions.Add(reversal);

        shift.RejectOpeningDifference(_currentUser.UserId, request.Note);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Warning,
            "ShiftOpeningDifferenceRejected",
            $"{actor?.FullName} {register.Name} kasasındaki ₺{shift.OpeningDifference} tutarındaki vardiya açılış farkını reddetti, kasa bakiyesi düzeltme öncesine geri alındı (yeni bakiye ₺{register.Balance})." +
                (string.IsNullOrWhiteSpace(request.Note) ? string.Empty : $" Not: {request.Note}"),
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
