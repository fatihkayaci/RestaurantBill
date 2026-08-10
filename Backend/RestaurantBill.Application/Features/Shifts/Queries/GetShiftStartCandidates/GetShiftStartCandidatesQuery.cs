using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftStartCandidates;

public class GetShiftStartCandidatesQuery : IRequest<Result<List<ShiftStartCandidateDto>>>
{
}
