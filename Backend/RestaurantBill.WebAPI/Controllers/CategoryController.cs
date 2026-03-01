using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize]//[Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryService _categoryService;
        public CategoryController(ICategoryService categoryService)
        {
            _categoryService = categoryService;
        }
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var values = await _categoryService.GetAllAsync();
            return Ok(values);
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCategoryById([FromRoute]int id)
        {
            var category = await _categoryService.GetByIdAsync(id);
            return Ok(category);
        }
        [HttpPost("create-category")]
        public async Task<IActionResult> CreateCategory([FromBody]CreateCategoryDto categoryDto, CancellationToken cancellationToken)
        {
            await _categoryService.CreateAsync(categoryDto, cancellationToken);
            return Ok("Kategori başarıyla oluşturuldu");
        }

        [HttpPut("update-category")]
        public async Task<IActionResult> UpdateCategory([FromBody]UpdateCategoryDto categoryDto, CancellationToken cancellationToken)
        {
            await _categoryService.UpdateAsync(categoryDto, cancellationToken);
            return Ok("Kategori başarıyla güncellendi");
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _categoryService.DeleteAsync(id, cancellationToken);
            return Ok("kategori başarıyla silindi");
        }
    }
}
