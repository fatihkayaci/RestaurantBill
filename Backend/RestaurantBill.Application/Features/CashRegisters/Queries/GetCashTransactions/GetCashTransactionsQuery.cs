using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashTransactions;

public class GetCashTransactionsQuery : IRequest<List<CashTransactionDto>>
{
}
