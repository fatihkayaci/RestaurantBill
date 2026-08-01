using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Companies.Commands.SetBranchSlug;
using RestaurantBill.Application.Features.Companies.Commands.UpdateCompany;
using RestaurantBill.Application.Features.Companies.Queries.GetMyCompany;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize]
    [Route("api/company")]
    [ApiController]
    public class CompanyController : BaseController
    {
        private readonly IMediator _mediator;
        public CompanyController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [Authorize(Roles = "Owner")]
        [HttpGet]
        public async Task<IActionResult> GetMyCompany(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetMyCompanyQuery(), cancellationToken);
            return HandleResult(result);
        }
        
        [Authorize(Roles = "Owner")]
        [HttpPost]
        public async Task<IActionResult> UpdateCompany([FromBody] UpdateCompanyCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        [Authorize(Roles = "Owner")]
        [HttpPost("branches/{id}/slug")]
        public async Task<IActionResult> SetBranchSlug([FromRoute] Guid id, [FromBody] SetBranchSlugCommand command, CancellationToken cancellationToken)
        {
            command.RestaurantId = id;
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }
    }
}
