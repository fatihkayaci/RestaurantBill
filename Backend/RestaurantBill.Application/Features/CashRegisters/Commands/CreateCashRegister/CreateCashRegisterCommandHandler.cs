using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.CreateCashRegister;

public class CreateCashRegisterHandler : IRequestHandler<CreateCashRegisterCommand>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CreateCashRegisterHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task Handle(CreateCashRegisterCommand request, CancellationToken cancellationToken)
    {
        int restaurantId = _currentUser.RestaurantId;
        CashRegister register = CashRegister.Create(request.Name, request.OpeningBalance, request.Status, restaurantId);

        await _uow.CashRegister.AddAsync(register);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
