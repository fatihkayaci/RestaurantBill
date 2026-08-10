using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftById;

public class GetShiftByIdQuery : IRequest<Result<ShiftDto>>
{
    public Guid ShiftId { get; set; }
}
