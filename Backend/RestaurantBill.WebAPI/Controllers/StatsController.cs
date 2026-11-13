using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Application.Features.Stats.Queries.GetOverviewStats;
using RestaurantBill.Application.Features.Stats.Queries.GetOwnerDashboard;
using RestaurantBill.Application.Features.Stats.Queries.GetDashboard;
using RestaurantBill.Application.Features.Stats.Queries.GetDashboardLayout;
using RestaurantBill.Application.Features.Stats.Commands.UpdateDashboardLayout;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize(Roles = "Owner,Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class StatsController : BaseController
    {
        private readonly IMediator _mediator;

        public StatsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetOverviewStatsQuery(), cancellationToken);
            return HandleResult(result);
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetDashboardQuery(), cancellationToken);
            return HandleResult(result);
        }

        [HttpGet("dashboard-layout")]
        public async Task<IActionResult> GetDashboardLayout(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetDashboardLayoutQuery(), cancellationToken);
            return HandleResult(result);
        }

        [HttpPut("dashboard-layout")]
        public async Task<IActionResult> UpdateDashboardLayout([FromBody] UpdateDashboardLayoutCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        [Authorize(Roles = "Owner")]
        [HttpGet("owner-dashboard")]
        public async Task<IActionResult> GetOwnerDashboard([FromQuery] DateTime? date, [FromQuery] int trendDays, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetOwnerDashboardQuery { Date = date, TrendDays = trendDays == 0 ? 7 : trendDays }, cancellationToken);
            return HandleResult(result);
        }
    }
}
