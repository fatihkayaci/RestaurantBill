using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.EnsureShiftOpen;

public class EnsureShiftOpenCommandHandler : IRequestHandler<EnsureShiftOpenCommand, Result<ShiftDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public EnsureShiftOpenCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<ShiftDto>> Handle(EnsureShiftOpenCommand request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;

        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null) return Result<ShiftDto>.Failure("Kasa bulunamadı.");

        if (register.Status != CashRegisterStatus.Open)
            return Result<ShiftDto>.Failure("Kapalı bir kasada gün başlatılamaz.");

        Shift? existing = await _db.Shifts
            .Include(s => s.CashRegister)
            .FirstOrDefaultAsync(s => s.CashRegisterId == request.CashRegisterId && s.Status == ShiftStatus.Open, cancellationToken);
        if (existing is not null)
            return Result<ShiftDto>.Success(existing.ToDto());

        // Sunucudan okunan bakiye açılış olarak yazılır: client'ın açılış bakiyesini
        // istediği gibi belirlemesini engeller ve fark oluşmadığı için sayım/onay akışına girmez.
        decimal openingBalance = register.Balance;
        Shift shift = Shift.Create(restaurantId, request.CashRegisterId, _currentUser.UserId, openingBalance, openingBalance);
        _db.Shifts.Add(shift);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            restaurantId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "ShiftAutoOpened",
            $"{actor?.FullName} {register.Name} kasasında günü başlattı (sayımsız).",
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);

        Shift created = await _db.Shifts
            .AsNoTracking()
            .Include(s => s.CashRegister)
            .FirstAsync(s => s.Id == shift.Id, cancellationToken);

        return Result<ShiftDto>.Success(created.ToDto());
    }
}
