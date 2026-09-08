using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftSummary;

public class GetShiftSummaryQuery : IRequest<Result<ShiftSummaryDto>>
{
    public Guid ShiftId { get; set; }
}
