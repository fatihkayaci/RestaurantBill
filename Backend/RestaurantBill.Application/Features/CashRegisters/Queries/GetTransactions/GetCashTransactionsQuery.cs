using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetTransactions;

public class GetCashTransactionsQuery : IRequest<List<CashTransactionDto>>
{
}
