using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Features.Categories.Commands.DeleteCategory;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Application.Features.Categories.Queries.GetAllCategories;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : BaseController
    {
        private readonly IMediator _mediator;
        public CategoryController(IMediator mediator)
        {
            _mediator = mediator;
        }
        #region get methods
        /// <summary>
        /// Returns all categories.
        /// </summary>
        /// <returns>200 OK with category list on success.</returns>
        [Authorize(Roles = "Owner,Admin,Waiter,Kitchen")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllCategoryQuery();
            var result = await _mediator.Send(query);
            return HandleResult(result);
        }
        #endregion
        #region post methods

        /// <summary>
        /// Creates a new category. Only accessible by Admin.
        /// </summary>
        /// <param name="command">Category creation details containing Name.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> CreateCategory([FromBody]CreateCategoryCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }
        
        /// <summary>
        /// Updates an existing category. Only accessible by Admin.
        /// </summary>
        /// <param name="command">Category update details containing Id and Name.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on update.</returns>
        
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateCategory([FromBody]UpdateCategoryCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }
            
        #endregion
        #region delete methods
        
        /// <summary>
        /// Deletes a category by its ID. Only accessible by Admin.
        /// </summary>
        /// <param name="id">The ID of the category to delete.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on deletion.</returns>
        
        [Authorize(Roles = "Owner,Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory([FromRoute]Guid id, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new DeleteCategoryCommand{Id= id}, cancellationToken);
            return HandleResult(result);
        }
        #endregion
    }
}
