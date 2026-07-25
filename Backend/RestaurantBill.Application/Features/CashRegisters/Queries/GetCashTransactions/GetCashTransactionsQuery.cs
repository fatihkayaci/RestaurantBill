using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashTransactions;

public class GetCashTransactionsQuery : IRequest<Result<List<CashTransactionDto>>>
{
}
