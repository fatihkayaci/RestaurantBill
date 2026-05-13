using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
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
        var register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, true);
        Guard.AgainstNull(register, "Kasa bulunamadı.");

        if (register!.Status != CashRegisterStatus.Open)
            throw new BusinessException("Kapalı bir kasaya işlem eklenemez.");

        if (request.Type == CashTransactionType.Out && register.Balance < request.Amount)
            throw new BusinessException("Kasa bakiyesi bu çıkışı karşılamak için yetersiz.");

        CashTransaction transaction = new CashTransaction
        {
            CashRegisterId = request.CashRegisterId,
            Type = request.Type,
            Amount = request.Amount,
            UserId = _currentUser.UserId
        };

        register.Balance += request.Type == CashTransactionType.In
            ? request.Amount
            : -request.Amount;

        await _uow.CashTransaction.AddAsync(transaction);
        await _uow.CashRegister.UpdateAsync(register);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
