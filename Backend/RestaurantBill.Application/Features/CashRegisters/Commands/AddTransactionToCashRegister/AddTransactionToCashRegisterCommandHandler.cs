using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;

public class AddTransactionToCashRegisterCommandHandler : IRequestHandler<AddTransactionToCashRegisterCommand>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public AddTransactionToCashRegisterCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task Handle(AddTransactionToCashRegisterCommand request, CancellationToken cancellationToken)
    {
        CashRegister? register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, true);
        Guard.AgainstNull(register, "Kasa bulunamadı.");

        CashTransaction transaction = register.AddTransaction(request.Type, request.Amount, _currentUser.UserId);

        await _uow.CashTransaction.AddAsync(transaction);
        await _uow.CashRegister.UpdateAsync(register);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
