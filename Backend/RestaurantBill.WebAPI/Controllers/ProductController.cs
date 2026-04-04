using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Products.Queries.GetAllProduct;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
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
        [Authorize(Roles = "Admin,Waiter,Kitchen")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllProductQuery();
            var products = await _mediator.Send(query);
            return Ok(products);
        }
            
        #endregion
        #region post methods
        
        /// <summary>
        /// Creates a new product. Only accessible by Admin and Kitchen.
        /// </summary>
        /// <param name="command">Product creation details containing CategoryId, Name, Price, IsActive and ImageUrl.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        [Authorize(Roles = "Admin,Kitchen")]
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody]CreateProductCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Ürün başarıyla oluşturuldu");
        }

        /// <summary>
        /// Updates an existing product. Only accessible by Admin and Kitchen.
        /// </summary>
        /// <param name="command">Product update details containing Id, CategoryId, Name, Price and IsActive.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on update.</returns>
        [Authorize(Roles = "Admin,Kitchen")]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateProduct([FromBody]UpdateProductCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Ürün başarıyla güncellendi");
        }
            
        #endregion

        #region delete methods
        /// <summary>
        /// Deletes a product by its ID. Only accessible by Admin and Kitchen.
        /// </summary>
        /// <param name="id">The ID of the product to delete.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on deletion.</returns>
        [Authorize(Roles = "Admin,Kitchen")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _mediator.Send(new DeleteProductCommand{Id = id}, cancellationToken);
            return Ok("Ürün başarıyla silindi");
        }    
        #endregion
    }
}
