using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.RejectShiftDifference;

public class RejectShiftDifferenceCommandHandler : IRequestHandler<RejectShiftDifferenceCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public RejectShiftDifferenceCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(RejectShiftDifferenceCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        Shift? shift = await _db.Shifts
            .InBranches(branchIds).FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null)
            return Result.Failure("Vardiya bulunamadı.");

        if (shift.Difference is null or 0)
            return Result.Failure("Bu vardiyada reddedilecek bir fark yok.");

        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == shift.CashRegisterId, cancellationToken);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        // Kasa bakiyesi sayılan nakde eşitlenmişti ve öyle kalır: ret sadece farkın kabul
        // edilmediğini işaretler. Düzeltmeyi geri almak bakiyeyi fiziksel nakitten koparırdı.
        shift.RejectDifference(_currentUser.UserId, request.Note);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            shift.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Warning,
            "ShiftDifferenceRejected",
            $"{actor?.FullName} {register.Name} kasasındaki ₺{shift.Difference} tutarındaki vardiya kapanış farkını reddetti. Kasa bakiyesi sayılan tutarda kaldı." +
                (string.IsNullOrWhiteSpace(request.Note) ? string.Empty : $" Not: {request.Note}"),
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
