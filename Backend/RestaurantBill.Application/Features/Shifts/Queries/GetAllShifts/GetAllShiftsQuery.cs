using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetAllShifts;

public class GetAllShiftsQuery : IRequest<Result<List<ShiftDto>>>
{
    public Guid? CashRegisterId { get; set; }
}
