using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Regions.Commands.CreateRegion;
using RestaurantBill.Application.Features.Regions.Commands.DeleteRegion;
using RestaurantBill.Application.Features.Regions.Commands.UpdateRegion;
using RestaurantBill.Application.Features.Regions.Queries.GetAllRegions;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RegionController : BaseController
    {
        private readonly IMediator _mediator;
        public RegionController(IMediator mediator)
        {
            _mediator = mediator;
        }
        #region get methods
        /// <summary>
        /// Returns all regions.
        /// </summary>
        /// <returns>200 OK with region list on success.</returns>
        [Authorize(Roles = "Owner,Admin,Waiter,Kitchen,Cashier")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllRegionQuery();
            var result = await _mediator.Send(query);
            return HandleResult(result);
        }
        #endregion
        #region post methods

        /// <summary>
        /// Creates a new region. Only accessible by Admin.
        /// </summary>
        /// <param name="command">Region creation details containing Name.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> CreateRegion([FromBody]CreateRegionCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        /// <summary>
        /// Updates an existing region. Only accessible by Admin.
        /// </summary>
        /// <param name="command">Region update details containing Id and Name.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on update.</returns>
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateRegion([FromBody]UpdateRegionCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        #endregion
        #region delete methods

        /// <summary>
        /// Deletes a region by its ID. Only accessible by Admin.
        /// </summary>
        /// <param name="id">The ID of the region to delete.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on deletion.</returns>
        [Authorize(Roles = "Owner,Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRegion([FromRoute]Guid id, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new DeleteRegionCommand{Id = id}, cancellationToken);
            return HandleResult(result);
        }
        #endregion
    }
}
