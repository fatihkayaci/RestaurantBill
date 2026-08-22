using MediatR;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Queries.GetOwnerDashboard
{
    public class GetOwnerDashboardQuery : IRequest<Result<OwnerDashboardDto>>
    {
        public DateTime? Date { get; set; }
        public int TrendDays { get; set; } = 7;
    }
}
