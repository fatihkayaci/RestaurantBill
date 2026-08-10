using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShiftTransactions;

public class GetMyCurrentShiftTransactionsQuery : IRequest<Result<List<ShiftTransactionDto>>>
{
}
