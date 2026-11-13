using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.OpenShift;

public class OpenShiftCommandHandler : IRequestHandler<OpenShiftCommand, Result<ShiftDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ICashierNotificationService _notifications;

    public OpenShiftCommandHandler(IAppDbContext db, ICurrentUserService currentUser, ICashierNotificationService notifications)
    {
        _db = db;
        _currentUser = currentUser;
        _notifications = notifications;
    }

    public async Task<Result<ShiftDto>> Handle(OpenShiftCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUser.CanStartShift())
            return Result<ShiftDto>.Failure(ShiftDtoLoader.CashierCannotStartShiftMessage);

        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        CashRegister? register = await _db.CashRegisters
            .InBranches(branchIds).FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null) return Result<ShiftDto>.Failure("Kasa bulunamadı.");

        if (register.Status != CashRegisterStatus.Open)
            return Result<ShiftDto>.Failure("Kapalı bir kasada vardiya açılamaz.");

        bool hasOpenShift = await _db.Shifts
            .AnyAsync(s => s.CashRegisterId == request.CashRegisterId && s.Status == ShiftStatus.Open, cancellationToken);
        if (hasOpenShift)
            return Result<ShiftDto>.Failure("Bu kasada başka birinin açık vardiyası var, devralmanız gerekiyor.");

        // Vardiya kimin adına açılacak: varsayılan isteği yapan; Admin/Owner şubedeki bir kasiyeri seçebilir.
        Guid openerId = _currentUser.UserId;
        string? openerName = null;
        if (request.ForUserId is Guid forUserId && forUserId != _currentUser.UserId)
        {
            if (!_currentUser.CanSeeExpectedBalance())
                return Result<ShiftDto>.Failure("Başkası adına vardiyayı yalnızca yönetici açabilir.");

            UserBranch? membership = await _db.UserBranches
                .AsNoTracking()
                .Include(ub => ub.User)
                .FirstOrDefaultAsync(ub => ub.UserId == forUserId && ub.BranchId == register.BranchId && !ub.IsDeleted && ub.IsActive
                    && (ub.Role == UserRole.Cashier || ub.Role == UserRole.Admin), cancellationToken);
            if (membership is null)
                return Result<ShiftDto>.Failure("Seçilen kişi bu şubede kasiyer ya da yönetici değil.");

            openerId = forUserId;
            openerName = membership.User.FullName;
        }

        bool userHasOpenShift = await _db.Shifts
            .AnyAsync(s => s.OpenedByUserId == openerId && s.Status == ShiftStatus.Open, cancellationToken);
        if (userHasOpenShift)
            return Result<ShiftDto>.Failure(openerName is null ? "Zaten açık bir vardiyanız var." : $"{openerName} adına zaten açık bir vardiya var.");

        // Önceki vardiya sayımla kapandıysa kasadaki nakit o sayımdır, tekrar saydırılmaz.
        // Sayılmadan kapandıysa (gün sonu otomatik kapanış vb.) bu açılış sayımı o vardiyanın
        // geç sayımı olur; aradaki fark kasaya dokunan son kişiye, yani önceki vardiyaya yazılır.
        Shift? previousShift = await _db.Shifts
            .Where(s => s.CashRegisterId == register.Id && s.Status == ShiftStatus.Closed)
            .OrderByDescending(s => s.ClosedAt)
            .FirstOrDefaultAsync(cancellationToken);

        CashTransaction? lateCountAdjustment = null;
        if (previousShift?.CountStatus == ShiftCountStatus.NotCounted)
        {
            if (request.CountedBalance is not decimal counted)
                return Result<ShiftDto>.Failure("Önceki vardiya sayılmadan kapanmış. Vardiyayı açmak için kasadaki nakdi sayın.");

            previousShift.ApplyLateCount(_currentUser.UserId, counted, "Sonraki vardiyanın açılış sayımı.");
            if (previousShift.Difference != 0)
            {
                lateCountAdjustment = register.ApplyShiftDifference(previousShift.Difference!.Value, _currentUser.UserId);
                _db.CashTransactions.Add(lateCountAdjustment);
            }
        }

        Shift shift = Shift.Create(register.BranchId, register.Id, openerId, register.Balance, register.Balance);
        // Düzeltme kaydı SaveChanges'ta zaman damgası aldığı için yeni vardiyanın aralığına düşer;
        // açılış bakiyesi bu düzeltmeyi zaten içerdiğinden vardiya hesabından hariç tutulur.
        if (lateCountAdjustment is not null)
            shift.LinkOpeningAdjustmentTransaction(lateCountAdjustment.Id);
        _db.Shifts.Add(shift);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            register.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            lateCountAdjustment is not null ? AuditLogSeverity.Warning : AuditLogSeverity.Info,
            "ShiftOpened",
            lateCountAdjustment is not null
                ? $"{actor?.FullName} {register.Name} kasasında{(openerName is null ? "" : $" {openerName} adına")} vardiya açtı. Sayılmadan kapanan önceki vardiya ₺{previousShift!.CountedClosingBalance} olarak sayıldı, ₺{previousShift.Difference} fark var. Admin incelemesi bekliyor."
                : $"{actor?.FullName} {register.Name} kasasında{(openerName is null ? "" : $" {openerName} adına")} ₺{shift.OpeningBalance} ile vardiya açtı.",
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        // Kasa atanmayı bekleyen kasiyerin ekranı bu olayla kendiliğinden açılır.
        await _notifications.SendShiftsChangedAsync(register.BranchId);
        return Result<ShiftDto>.Success(await _db.ToDtoWithOwnerAsync(shift, cancellationToken));
    }
}
