using AutoMapper;
using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetAll;

public class GetAllCashRegisterHandler : IRequestHandler<GetAllCashRegisterQuery, List<CashRegisterDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly ICurrentUserService _currentUser;

    public GetAllCashRegisterHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
    {
        _uow = uow;
        _mapper = mapper;
        _currentUser = currentUser;
    }

    public async Task<List<CashRegisterDto>> Handle(GetAllCashRegisterQuery request, CancellationToken cancellationToken)
    {
        int restaurantId = _currentUser.RestaurantId;
        if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");

        var entities = await _uow.CashRegister.GetAllAsync(c => c.RestaurantId == restaurantId);
        return _mapper.Map<List<CashRegisterDto>>(entities.OrderBy(r => r.Name));
    }
}
