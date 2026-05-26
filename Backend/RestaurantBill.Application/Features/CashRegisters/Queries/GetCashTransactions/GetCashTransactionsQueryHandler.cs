using AutoMapper;
using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashTransactions;

public class GetCashTransactionsQueryHandler : IRequestHandler<GetCashTransactionsQuery, List<CashTransactionDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly ICurrentUserService _currentUser;

    public GetCashTransactionsQueryHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
    {
        _uow = uow;
        _mapper = mapper;
        _currentUser = currentUser;
    }

    public async Task<List<CashTransactionDto>> Handle(GetCashTransactionsQuery request, CancellationToken cancellationToken)
    {
        var restaurantId = _currentUser.RestaurantId;
        if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
        var entities = await _uow.CashTransaction.GetAllAsync(t => t.CashRegister.RestaurantId == restaurantId);
        return _mapper.Map<List<CashTransactionDto>>(entities.OrderByDescending(t => t.CreatedAt).Take(50));
    }
}
