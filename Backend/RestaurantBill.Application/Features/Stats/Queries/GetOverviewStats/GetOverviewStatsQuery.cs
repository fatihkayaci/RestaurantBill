using MediatR;
using RestaurantBill.Application.DTOs.Stats;

namespace RestaurantBill.Application.Features.Stats.Queries.GetOverviewStats
{
    public class GetOverviewStatsQuery : IRequest<OverviewStatsDto>
    {
    }
}
