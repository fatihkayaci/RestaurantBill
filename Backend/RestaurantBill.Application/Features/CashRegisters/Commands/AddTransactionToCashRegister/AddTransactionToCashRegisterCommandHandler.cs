using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;

public class AddTransactionToCashRegisterCommandHandler : IRequestHandler<AddTransactionToCashRegisterCommand, Result>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public AddTransactionToCashRegisterCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(AddTransactionToCashRegisterCommand request, CancellationToken cancellationToken)
    {
        CashRegister? register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, true);
        if (register is null)
            return Result.Failure("Kasa Bulunamadı");

        CashTransaction transaction = register.AddTransaction(request.Type, request.Amount, _currentUser.UserId);

        await _uow.CashTransaction.AddAsync(transaction);
        await _uow.CashRegister.UpdateAsync(register);

        User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Payment,
            AuditLogSeverity.Info,
            "CashTransactionAdded",
            $"{actor?.FullName} {register.Name} kasasına ₺{request.Amount} tutarında {request.Type} işlemi ekledi.",
            nameof(CashRegister),
            register.Id);
        await _uow.AuditLog.AddAsync(log);

        await _uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
