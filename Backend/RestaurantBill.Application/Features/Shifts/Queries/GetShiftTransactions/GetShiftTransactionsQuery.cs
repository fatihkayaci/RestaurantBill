using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftTransactions;

public class GetShiftTransactionsQuery : IRequest<Result<List<ShiftTransactionDto>>>
{
    public Guid ShiftId { get; set; }
}
