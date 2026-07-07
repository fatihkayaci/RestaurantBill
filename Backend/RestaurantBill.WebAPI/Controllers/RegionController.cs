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
    public class RegionController : ControllerBase
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
        [Authorize(Roles = "Admin,Waiter,Kitchen,Cashier")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllRegionQuery();
            var regions = await _mediator.Send(query);
            return Ok(regions);
        }
        #endregion
        #region post methods

        /// <summary>
        /// Creates a new region. Only accessible by Admin.
        /// </summary>
        /// <param name="command">Region creation details containing Name.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> CreateRegion([FromBody]CreateRegionCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Bölge başarıyla oluşturuldu");
        }

        /// <summary>
        /// Updates an existing region. Only accessible by Admin.
        /// </summary>
        /// <param name="command">Region update details containing Id and Name.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on update.</returns>
        [Authorize(Roles = "Admin")]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateRegion([FromBody]UpdateRegionCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Bölge başarıyla güncellendi");
        }

        #endregion
        #region delete methods

        /// <summary>
        /// Deletes a region by its ID. Only accessible by Admin.
        /// </summary>
        /// <param name="id">The ID of the region to delete.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on deletion.</returns>
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRegion([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _mediator.Send(new DeleteRegionCommand{Id = id}, cancellationToken);
            return Ok("Bölge başarıyla silindi");
        }
        #endregion
    }
}
