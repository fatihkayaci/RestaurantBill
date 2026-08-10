using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShift;

public class GetMyCurrentShiftQuery : IRequest<Result<ShiftDto>>
{
}
