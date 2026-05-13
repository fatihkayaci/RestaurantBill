using AutoMapper;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashRegisterById;

public class GetCashRegisterByIdHandler : IRequestHandler<GetCashRegisterByIdQuery, CashRegisterDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public GetCashRegisterByIdHandler(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<CashRegisterDto> Handle(GetCashRegisterByIdQuery request, CancellationToken cancellationToken)
    {
        var register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, false);
        Guard.AgainstNull(register, "Kasa bulunamadı.");
        return _mapper.Map<CashRegisterDto>(register);
    }
}
