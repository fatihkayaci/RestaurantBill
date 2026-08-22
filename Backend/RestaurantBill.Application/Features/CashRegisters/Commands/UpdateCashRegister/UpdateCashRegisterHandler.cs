using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.UpdateCashRegister;

public class UpdateCashRegisterHandler : IRequestHandler<UpdateCashRegisterCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UpdateCashRegisterHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(UpdateCashRegisterCommand request, CancellationToken cancellationToken)
    {
        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);
        if (register is null) return Result.Failure("Böyle bir kasa bulunamadı");

        register.Update(request.Name, request.Balance, request.Status);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "CashRegisterUpdated",
            $"{actor?.FullName} {register.Name} kasasını güncelledi.",
            nameof(CashRegister),
            register.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
