using AutoMapper;
using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetAll;

public class GetAllCashRegisterHandler : IRequestHandler<GetAllCashRegisterQuery, List<CashRegisterDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public GetAllCashRegisterHandler(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<List<CashRegisterDto>> Handle(GetAllCashRegisterQuery request, CancellationToken cancellationToken)
    {
        var entities = await _uow.CashRegister.GetAllAsync();
        return _mapper.Map<List<CashRegisterDto>>(entities.OrderBy(r => r.Name));
    }
}
