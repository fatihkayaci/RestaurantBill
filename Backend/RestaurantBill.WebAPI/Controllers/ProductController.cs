using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Products.Queries.GetAllProduct;

namespace RestaurantBill.WebAPI.Controllers
{
    // [Authorize]
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
        /// returns all Products
        /// </summary>
        /// <returns>200 OK with Products data on success.</returns>
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
        /// Product create
        /// </summary>
        /// <param name="command">Product create credentials containing CategoryId, Name, Price, IsActive and ImageUrl </param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with string message on success.</returns>
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody]CreateProductCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Ürün başarıyla oluşturuldu");
        }

        /// <summary>
        /// Product update
        /// </summary>
        /// <param name="command">Product update credentials containing Id, CategoryId, Name, Price and IsActive </param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with string message on success.</returns>
        [HttpPost("update")]
        public async Task<IActionResult> UpdateProduct([FromBody]UpdateProductCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Ürün başarıyla güncellendi");
        }
            
        #endregion

        #region delete methods
        /// <summary>
        /// Product delete with product id
        /// </summary>
        /// <param name="id">Product Id need for product delete</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with string message on success.</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _mediator.Send(new DeleteProductCommand{Id = id}, cancellationToken);
            return Ok("Ürün başarıyla silindi");
        }    
        #endregion
    }
}
