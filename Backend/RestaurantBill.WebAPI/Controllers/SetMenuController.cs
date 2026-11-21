using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.SetMenus;

namespace RestaurantBill.WebAPI.Controllers
{
    /// <summary>
    /// Set menüler ("Adana Menü"): bölümleri ve seçenekleriyle paketler. Yazma Owner/Admin'e açık; sipariş alan roller
    /// listeyi okur. Siparişe ekleme <c>POST api/order/add-set-menu</c> ile yapılır.
    /// </summary>
    [Authorize]
    [Route("api/set-menu")]
    [ApiController]
    public class SetMenuController : BaseController
    {
        private readonly IMediator _mediator;

        public SetMenuController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary> Returns the branch's set menus (inactive ones included, without cost). </summary>
        [Authorize(Roles = "Owner,Admin,Waiter")]
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetSetMenusQuery(), cancellationToken);
            return HandleResult(result);
        }

        /// <summary> Returns the branch's set menus with option costs and the estimated set cost (default options). </summary>
        [Authorize(Roles = "Owner,Admin")]
        [HttpGet("with-cost")]
        public async Task<IActionResult> GetAllWithCost(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetSetMenusQuery { IncludeCost = true }, cancellationToken);
            return HandleResult(result);
        }

        /// <summary> Creates a set menu with its slots. Returns the new set menu's id. </summary>
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSetMenuCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        /// <summary> Updates a set menu. Slots sent with an id are updated in place, slots without an id are added, missing slots are deleted. </summary>
        [Authorize(Roles = "Owner,Admin")]
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateSetMenuCommand command, CancellationToken cancellationToken)
        {
            command.Id = id;
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        /// <summary> Uploads (or replaces) the set menu's image (JPEG, PNG or WebP, max 5 MB). Returns the CDN url. </summary>
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("{id:guid}/image")]
        [RequestSizeLimit(6_000_000)]
        public async Task<IActionResult> UploadImage([FromRoute] Guid id, IFormFile file, CancellationToken cancellationToken)
        {
            if (file is null || file.Length == 0)
                return BadRequest(new { Error = "Dosya seçilmedi." });

            await using Stream stream = file.OpenReadStream();
            var command = new UploadSetMenuImageCommand
            {
                SetMenuId = id,
                Content = stream,
                ContentType = file.ContentType,
                Length = file.Length
            };

            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        /// <summary> Sets the set menu's image to a stock (shared library) image; nothing is uploaded or copied. Returns the CDN url. </summary>
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("{id:guid}/stock-image")]
        public async Task<IActionResult> SetStockImage([FromRoute] Guid id, [FromBody] StockImageBody body, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new SetSetMenuStockImageCommand { SetMenuId = id, StockImageId = body.StockImageId }, cancellationToken);
            return HandleResult(result);
        }

        public sealed record StockImageBody(Guid StockImageId);

        /// <summary> Sets the order of the branch's set menus (first id is shown first). </summary>
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("reorder")]
        public async Task<IActionResult> Reorder([FromBody] ReorderSetMenusCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        /// <summary> Deletes a set menu that has never been ordered. </summary>
        [Authorize(Roles = "Owner,Admin")]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new DeleteSetMenuCommand { Id = id }, cancellationToken);
            return HandleResult(result);
        }
    }
}
