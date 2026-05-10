using AutoMapper;
using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetTransactions;

public class GetCashTransactionsQueryHandler : IRequestHandler<GetCashTransactionsQuery, List<CashTransactionDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public GetCashTransactionsQueryHandler(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<List<CashTransactionDto>> Handle(GetCashTransactionsQuery request, CancellationToken cancellationToken)
    {
        var entities = await _uow.CashTransaction.GetAllAsync();
        return _mapper.Map<List<CashTransactionDto>>(entities.OrderByDescending(t => t.CreatedAt).Take(50));
    }
}
