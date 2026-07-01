using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashRegisterById;

public class GetCashRegisterByIdHandler : IRequestHandler<GetCashRegisterByIdQuery, CashRegisterDto>
{
    private readonly IUnitOfWork _uow;

    public GetCashRegisterByIdHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<CashRegisterDto> Handle(GetCashRegisterByIdQuery request, CancellationToken cancellationToken)
    {
        var register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, false);
        Guard.AgainstNull(register, "Kasa bulunamadı.");
        return register.ToDto();
    }
}
