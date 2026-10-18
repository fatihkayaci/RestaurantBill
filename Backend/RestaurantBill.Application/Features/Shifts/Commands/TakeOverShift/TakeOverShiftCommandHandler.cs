using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.TakeOverShift;

// Kasada başkasının vardiyası açıkken (unutulmuş, kişi ayrılmış) yeni kişi kasayı devralır:
// tek bir kör sayım hem eski vardiyanın kapanışı hem yeni vardiyanın açılışı olur.
public class TakeOverShiftCommandHandler : IRequestHandler<TakeOverShiftCommand, Result<ShiftDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IShiftBalanceCalculator _balanceCalculator;

    public TakeOverShiftCommandHandler(IAppDbContext db, ICurrentUserService currentUser, IShiftBalanceCalculator balanceCalculator)
    {
        _db = db;
        _currentUser = currentUser;
        _balanceCalculator = balanceCalculator;
    }

    public async Task<Result<ShiftDto>> Handle(TakeOverShiftCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        CashRegister? register = await _db.CashRegisters
            .InBranches(branchIds).FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null) return Result<ShiftDto>.Failure("Kasa bulunamadı.");

        if (register.Status != CashRegisterStatus.Open)
            return Result<ShiftDto>.Failure("Kapalı bir kasada vardiya açılamaz.");

        Shift? current = await _db.Shifts
            .FirstOrDefaultAsync(s => s.CashRegisterId == register.Id && s.Status == ShiftStatus.Open, cancellationToken);
        if (current is null)
            return Result<ShiftDto>.Failure("Bu kasada devralınacak açık bir vardiya yok.");

        if (current.OpenedByUserId == _currentUser.UserId)
            return Result<ShiftDto>.Failure("Bu vardiya zaten sizin.");

        bool userHasOpenShift = await _db.Shifts
            .AnyAsync(s => s.OpenedByUserId == _currentUser.UserId && s.Status == ShiftStatus.Open, cancellationToken);
        if (userHasOpenShift)
            return Result<ShiftDto>.Failure("Zaten açık bir vardiyanız var.");

        decimal expectedClosingBalance = await _balanceCalculator.CalculateExpectedClosingBalanceAsync(current, cancellationToken);
        current.Close(_currentUser.UserId, expectedClosingBalance, request.CountedBalance,
            string.IsNullOrWhiteSpace(request.Note) ? "Vardiya devri." : request.Note);

        CashTransaction? adjustment = null;
        if (current.Difference != 0)
        {
            adjustment = register.ApplyShiftDifference(current.Difference!.Value, _currentUser.UserId);
            _db.CashTransactions.Add(adjustment);
        }

        Shift shift = Shift.Create(register.BranchId, register.Id, _currentUser.UserId, register.Balance, register.Balance);
        // Düzeltme kaydı SaveChanges'ta zaman damgası aldığı için yeni vardiyanın aralığına düşer;
        // açılış bakiyesi bu düzeltmeyi zaten içerdiğinden vardiya hesabından hariç tutulur.
        if (adjustment is not null)
            shift.LinkOpeningAdjustmentTransaction(adjustment.Id);
        _db.Shifts.Add(shift);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        User? previousOwner = await _db.Users.FirstOrDefaultAsync(u => u.Id == current.OpenedByUserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            register.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            adjustment is not null ? AuditLogSeverity.Warning : AuditLogSeverity.Info,
            "ShiftTakenOver",
            $"{actor?.FullName}, {register.Name} kasasında {previousOwner?.FullName} adına açık vardiyayı devraldı. Beklenen: ₺{current.ExpectedClosingBalance}, Sayılan: ₺{current.CountedClosingBalance}, Fark: ₺{current.Difference}." +
                (adjustment is not null ? " Kasa bakiyesi sayılan tutara eşitlendi, admin incelemesi bekliyor." : string.Empty),
            nameof(Shift),
            current.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result<ShiftDto>.Success(await _db.ToDtoWithOwnerAsync(shift, cancellationToken));
    }
}
