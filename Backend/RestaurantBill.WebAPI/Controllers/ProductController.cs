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
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllProductQuery();
            var products = await _mediator.Send(query);
            return Ok(products);
        }
        
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody]CreateProductCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Ürün başarıyla oluşturuldu");
        }
        [HttpPost("update")]
        public async Task<IActionResult> UpdateProduct([FromBody]UpdateProductCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Ürün başarıyla güncellendi");
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _mediator.Send(new DeleteProductCommand{Id = id});
            return Ok("Ürün başarıyla silindi");
        }
        /*
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProductById([FromRoute]int id)
        {
            var product = await _productService.GetByIdAsync(id);
            return Ok(product);
        }*/
        
    }
}
