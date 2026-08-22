using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;

public class AddTransactionToCashRegisterCommandHandler : IRequestHandler<AddTransactionToCashRegisterCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public AddTransactionToCashRegisterCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(AddTransactionToCashRegisterCommand request, CancellationToken cancellationToken)
    {
        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null)
            return Result.Failure("Kasa Bulunamadı");

        CashTransaction transaction = register.AddTransaction(request.Type, request.Amount, _currentUser.UserId);
        _db.CashTransactions.Add(transaction);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Payment,
            AuditLogSeverity.Info,
            "CashTransactionAdded",
            $"{actor?.FullName} {register.Name} kasasına ₺{request.Amount} tutarında {request.Type} işlemi ekledi.",
            nameof(CashRegister),
            register.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
