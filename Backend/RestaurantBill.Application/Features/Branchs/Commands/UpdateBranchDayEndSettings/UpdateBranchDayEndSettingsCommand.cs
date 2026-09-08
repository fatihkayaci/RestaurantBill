using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranchDayEndSettings;

public class UpdateBranchDayEndSettingsCommand : IRequest<Result>
{
    public Guid BranchId { get; set; }
    public TimeOnly DayEndTime { get; set; }
    public string TimeZoneId { get; set; } = string.Empty;
}
