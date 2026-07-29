using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Application.Features.Stats.Queries.GetOverviewStats;

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
    }
}
