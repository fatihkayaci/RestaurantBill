using MediatR;
using Microsoft.AspNetCore.Http;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.Create;

public class CreateCashRegisterHandler : IRequestHandler<CreateCashRegisterCommand>
{
    private readonly IUnitOfWork _uow;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CreateCashRegisterHandler(IUnitOfWork uow, IHttpContextAccessor httpContextAccessor)
    {
        _uow = uow;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task Handle(CreateCashRegisterCommand request, CancellationToken cancellationToken)
    {
        int restaurantId = int.Parse(
            _httpContextAccessor.HttpContext!.User.FindFirst("RestaurantId")!.Value);

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
