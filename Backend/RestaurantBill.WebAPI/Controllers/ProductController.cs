using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProductImageFocus;
using RestaurantBill.Application.Features.Products.Commands.UploadProductImage;
using RestaurantBill.Application.Features.Products.Queries.GetAllProduct;

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

        /// <summary>
        /// Sets which part of an already-uploaded product image should stay visible when it's cropped
        /// (e.g. in a fixed-aspect-ratio card). Only accessible by Admin and Kitchen.
        /// </summary>
        /// <param name="id">The ID of the product whose image focus is being set.</param>
        /// <param name="command">The desired image focus (Top, Center or Bottom).</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK on success.</returns>
        [Authorize(Roles = "Owner,Admin,Kitchen")]
        [HttpPost("{id}/image-focus")]
        public async Task<IActionResult> UpdateProductImageFocus([FromRoute] Guid id, [FromBody] UpdateProductImageFocusCommand command, CancellationToken cancellationToken)
        {
            command.ProductId = id;
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }

        #endregion

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
