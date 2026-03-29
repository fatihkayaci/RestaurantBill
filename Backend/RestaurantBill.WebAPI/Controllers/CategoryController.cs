using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Features.Categories.Commands.DeleteCategory;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Application.Features.Categories.Queries.GetAllCategories;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Controllers
{
    //[Authorize]//[Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly IMediator _mediator;
        public CategoryController(IMediator mediator)
        {
            _mediator = mediator;
        }
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllCategoryQuery();
            var categories = await _mediator.Send(query);
            return Ok(categories);
        }
        [HttpPost("create")]
        public async Task<IActionResult> CreateCategory([FromBody]CreateCategoryCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Kategori başarıyla oluşturuldu");
        }
        [HttpPost("update")]
        public async Task<IActionResult> UpdateCategory([FromBody]UpdateCategoryCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Kategori başarıyla güncellendi");
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _mediator.Send(new DeleteCategoryCommand{Id= id}, cancellationToken);
            return Ok("kategori başarıyla silindi");
        }
        /*
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCategoryById([FromRoute]int id)
        {
            var category = await _categoryService.GetByIdAsync(id);
            return Ok(category);
        }
        */
    }
}
