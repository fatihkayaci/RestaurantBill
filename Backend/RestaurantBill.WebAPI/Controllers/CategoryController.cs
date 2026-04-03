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
        #region get methods
        /// <summary>
        /// returns all categories
        /// </summary>
        /// <returns>200 OK with categories data on success.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllCategoryQuery();
            var categories = await _mediator.Send(query);
            return Ok(categories);
        }
        #endregion
        #region post methods

        /// <summary>
        /// Category create with command
        /// </summary>
        /// <param name="command">Category create credentials containing Name</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with string message on success.</returns>
        [HttpPost("create")]
        public async Task<IActionResult> CreateCategory([FromBody]CreateCategoryCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Kategori başarıyla oluşturuldu");
        }
        
        /// <summary>
        /// Category update with command
        /// </summary>
        /// <param name="command">Category update credentials containing Id and Name</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with string message on success.</returns>
        [HttpPost("update")]
        public async Task<IActionResult> UpdateCategory([FromBody]UpdateCategoryCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Kategori başarıyla güncellendi");
        }
            
        #endregion
        #region delete methods
        
        /// <summary>
        /// category delete with id
        /// </summary>
        /// <param name="id">Category Id need for category delete</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with string message on success.</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _mediator.Send(new DeleteCategoryCommand{Id= id}, cancellationToken);
            return Ok("kategori başarıyla silindi");
        }
        #endregion
    }
}
