using MediatR;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Queries.GetOverviewStats
{
    public class GetOverviewStatsQuery : IRequest<Result<OverviewStatsDto>>
    {
    }
}
