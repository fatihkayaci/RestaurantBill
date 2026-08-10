using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShiftSummary;

public class GetMyCurrentShiftSummaryQuery : IRequest<Result<ShiftSummaryDto>>
{
}
