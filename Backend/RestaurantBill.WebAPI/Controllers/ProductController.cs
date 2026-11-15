using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Application.Features.Products.Commands.SetProductStock;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Products.Commands.UploadProductImage;
using RestaurantBill.Application.Features.Products.Queries.GetAllProduct;
using RestaurantBill.Application.Features.Products.Queries.GetAllProductWithCost;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : BaseController
    {
        private readonly IMediator _mediator;
        public ProductController(IMediator mediator)
        {
            _mediator = mediator;
        }
        #region get methods
        /// <summary>
        /// Returns all products including their associated category information.
        /// </summary>
        /// <returns>200 OK with product list on success.</returns>
        [Authorize(Roles = "Owner,Admin,Waiter,Kitchen")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllProductQuery();
            var result = await _mediator.Send(query);
            return HandleResult(result);
        }

        /// <summary>
        /// Returns all products together with their unit cost. Cost is only visible to Owner and Admin;
        /// waiter, kitchen and cashier screens use <see cref="GetAll"/>, which never includes it.
        /// </summary>
        /// <returns>200 OK with product list (including cost) on success.</returns>
        [Authorize(Roles = "Owner,Admin")]
        [HttpGet("with-cost")]
        public async Task<IActionResult> GetAllWithCost(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetAllProductWithCostQuery(), cancellationToken);
            return HandleResult(result);
        }
            
        #endregion
        #region post methods
        
        /// <summary>
        /// Creates a new product. Only accessible by Admin and Kitchen.
        /// </summary>
        /// <param name="command">Product creation details containing CategoryId, Name, Price, IsActive and ImageUrl.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        [Authorize(Roles = "Owner,Admin,Kitchen")]
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody]CreateProductCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        /// <summary>
        /// Updates an existing product. Only accessible by Admin and Kitchen.
        /// </summary>
        /// <param name="command">Product update details containing Id, CategoryId, Name, Price and IsActive.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on update.</returns>
        [Authorize(Roles = "Owner,Admin,Kitchen")]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateProduct([FromBody]UpdateProductCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        /// <summary>
        /// Uploads (or replaces) the image of an existing product. Only accessible by Admin and Kitchen.
        /// </summary>
        /// <param name="id">The ID of the product whose image is being set.</param>
        /// <param name="file">The image file (JPEG, PNG or WebP, max 5 MB).</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with the full CDN URL of the uploaded image on success.</returns>
        [Authorize(Roles = "Owner,Admin,Kitchen")]
        [HttpPost("{id}/image")]
        [RequestSizeLimit(6_000_000)]
        public async Task<IActionResult> UploadProductImage([FromRoute] Guid id, IFormFile file, CancellationToken cancellationToken)
        {
            if (file is null || file.Length == 0)
                return BadRequest(new { Error = "Dosya seçilmedi." });

            await using Stream stream = file.OpenReadStream();
            var command = new UploadProductImageCommand
            {
                ProductId = id,
                Content = stream,
                ContentType = file.ContentType,
                Length = file.Length
            };

            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        #endregion

        /// <summary>
        /// "Tükendi" anahtarı: ürün masada satılmaya devam eder, online siparişte seçilemez.
        /// </summary>
        [Authorize(Roles = "Owner,Admin,Cashier,Kitchen")]
        [HttpPatch("{id:guid}/stock")]
        public async Task<IActionResult> SetStock([FromRoute] Guid id, [FromBody] StockBody body, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new SetProductStockCommand { Id = id, IsOutOfStock = body.IsOutOfStock }, cancellationToken);
            return HandleResult(result);
        }

        public sealed record StockBody(bool IsOutOfStock);

        #region delete methods
        /// <summary>
        /// Deletes a product by its ID. Only accessible by Admin and Kitchen.
        /// </summary>
        /// <param name="id">The ID of the product to delete.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on deletion.</returns>
        [Authorize(Roles = "Owner,Admin,Kitchen")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct([FromRoute]Guid id, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new DeleteProductCommand{Id = id}, cancellationToken);
            return HandleResult(result);
        }    
        #endregion
    }
}
