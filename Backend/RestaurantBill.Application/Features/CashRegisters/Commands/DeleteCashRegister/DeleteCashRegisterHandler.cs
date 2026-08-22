using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;

public class DeleteCashRegisterHandler : IRequestHandler<DeleteCashRegisterCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public DeleteCashRegisterHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(DeleteCashRegisterCommand request, CancellationToken cancellationToken)
    {
        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null) return Result.Failure("Kasa Bulunamadı");

        register.EnsureCanBeDeleted();

        _db.CashRegisters.Remove(register);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Warning,
            "CashRegisterDeleted",
            $"{actor?.FullName} {register.Name} kasasını sildi.",
            nameof(CashRegister),
            register.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
