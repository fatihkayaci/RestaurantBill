using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApplyLateCount;

public class ApplyLateCountCommandHandler : IRequestHandler<ApplyLateCountCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public ApplyLateCountCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(ApplyLateCountCommand request, CancellationToken cancellationToken)
    {
        Shift? shift = await _db.Shifts
            .FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null) return Result.Failure("Vardiya bulunamadı.");

        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == shift.CashRegisterId, cancellationToken);
        if (register is null) return Result.Failure("Kasa bulunamadı.");

        shift.ApplyLateCount(_currentUser.UserId, request.CountedClosingBalance, request.Note);

        // Fark, sayım anındaki kasa bakiyesine göre değil bir düzeltme (delta) olarak uygulanır;
        // aradan geçen süre içinde kasada başka işlemler olmuş olsa da doğru sonucu verir.
        bool hasDifference = shift.Difference != 0;
        if (hasDifference)
        {
            CashTransaction adjustment = register.ApplyShiftDifference(shift.Difference!.Value, _currentUser.UserId);
            _db.CashTransactions.Add(adjustment);
        }

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            hasDifference ? AuditLogSeverity.Warning : AuditLogSeverity.Info,
            "ShiftLateCounted",
            hasDifference
                ? $"{actor?.FullName} {register.Name} kasasında sonradan sayım girdi. Beklenen: ₺{shift.ExpectedClosingBalance}, Sayılan: ₺{shift.CountedClosingBalance}, Fark: ₺{shift.Difference}. Kasa bakiyesi anında düzeltildi, admin incelemesi bekliyor."
                : $"{actor?.FullName} {register.Name} kasasında sonradan sayım girdi. Beklenen: ₺{shift.ExpectedClosingBalance}, Sayılan: ₺{shift.CountedClosingBalance}, fark yok.",
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
