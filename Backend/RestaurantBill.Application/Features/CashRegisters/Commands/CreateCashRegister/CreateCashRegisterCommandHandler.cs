using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.CreateCashRegister;

public class CreateCashRegisterHandler : IRequestHandler<CreateCashRegisterCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CreateCashRegisterHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(CreateCashRegisterCommand request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;
        CashRegister register = CashRegister.Create(request.Name, request.OpeningBalance, restaurantId);
        _db.CashRegisters.Add(register);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            restaurantId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "CashRegisterCreated",
            $"{actor?.FullName} {register.Name} adında yeni bir kasa ekledi.",
            nameof(CashRegister),
            register.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
