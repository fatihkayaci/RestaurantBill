using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly IProductService _productService;
        public ProductController(IProductService productService)
        {
            _productService = productService;
        }
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var values = await _productService.GetAllAsync();
            return Ok(values);
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProductById([FromRoute]int id)
        {
            var product = await _productService.GetByIdAsync(id);
            return Ok(product);
        }
        [HttpPost("create-product")]
        public async Task<IActionResult> CreateProduct([FromBody]CreateProductDto dto, CancellationToken cancellationToken)
        {
            await _productService.CreateAsync(dto, cancellationToken);
            return Ok("Ürün başarıyla oluşturuldu");
        }

        [HttpPut("update-product")]
        public async Task<IActionResult> UpdateProduct([FromBody]UpdateProductDto dto, CancellationToken cancellationToken)
        {
            await _productService.UpdateAsync(dto, cancellationToken);
            return Ok("Ürün başarıyla güncellendi");
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _productService.DeleteAsync(id, cancellationToken);
            return Ok("kategori başarıyla silindi");
        }
    }
}
