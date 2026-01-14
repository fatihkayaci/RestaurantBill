using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;

namespace RestaurantBill.WebAPI.Controllers
{
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
        [HttpPost]
        public async Task<IActionResult> Add(CreateProductDto productDto)
        {
            await _productService.AddAsync(productDto);
            return Ok("Ürün başarıyla eklendi");
        }
    }
}
