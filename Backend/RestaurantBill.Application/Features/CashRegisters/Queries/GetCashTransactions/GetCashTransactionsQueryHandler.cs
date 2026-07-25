using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashTransactions;

public class GetCashTransactionsQueryHandler : IRequestHandler<GetCashTransactionsQuery, Result<List<CashTransactionDto>>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetCashTransactionsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<List<CashTransactionDto>>> Handle(GetCashTransactionsQuery request, CancellationToken cancellationToken)
    {
        var restaurantId = _currentUser.RestaurantId;
        if(restaurantId <= 0) return Result<List<CashTransactionDto>>.Failure("ID değeri 0 veya negatif olamaz.");

        var entities = await _uow.CashTransaction.GetAllAsync(t => t.CashRegister.RestaurantId == restaurantId);
        return Result<List<CashTransactionDto>>.Success(entities.OrderByDescending(t => t.CreatedAt).Take(50).Select(t => t.ToDto()).ToList());
    }
}
