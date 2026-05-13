using MediatR;
using RestaurantBill.Application.Exceptions;
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
        if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
        
        CashRegister register = new CashRegister
        {
            Name = request.Name,
            Balance = request.OpeningBalance,
            Status = request.Status,
            RestaurantId = restaurantId
        };

        await _uow.CashRegister.AddAsync(register);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
