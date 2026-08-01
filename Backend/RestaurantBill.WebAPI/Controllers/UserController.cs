using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.DeleteUser;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Features.Users.Queries.GetCurrentUser;
using RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId;

namespace RestaurantBill.WebAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : BaseController
    {
        private readonly IMediator _mediator;
        public UserController(IMediator mediator)
        {
            _mediator = mediator;
        }
        #region get methods
        /// <summary>
        /// Returns all users belonging to the authenticated user's restaurant.
        /// </summary>
        /// <returns>200 OK with user list on success.</returns>
        
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var result = await _mediator.Send(new GetCurrentUserQuery());
            return HandleResult(result);
        }

        [Authorize(Roles = "Owner,Admin")]
        [HttpGet]
        public async Task<IActionResult> GetUserByRestaurantId()
        {
            var query = new GetUserByRestaurantIdCommand();
            var result = await _mediator.Send(query);
            return HandleResult(result);
        }
            
        #endregion
        #region post methods
        /// <summary>
        /// Creates a new user and associates them with the authenticated user's restaurant.
        /// </summary>
        /// <param name="command">User creation details containing FullName, UserName, Email, PhoneNumber, PasswordHash, UserCode and Role.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> CreateUser([FromBody]CreateUserCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }
        /// <summary>
        /// Creates a new user and associates them with the authenticated user's restaurant.
        /// </summary>
        /// <param name="command">User creation details containing FullName, UserName, Email, PhoneNumber, PasswordHash, UserCode and Role.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        
        [Authorize(Roles = "Owner,Admin")]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateUser([FromBody]UpdateUserCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }
            
        #endregion
        #region delete methods
        /// <summary>
        /// Deletes a user by their ID.
        /// </summary>
        /// <param name="id">The ID of the user to delete.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on deletion.</returns>
        
        [Authorize(Roles = "Owner,Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser([FromRoute]Guid id, CancellationToken cancellationToken)
        {
            var command = new DeleteUserCommand
            {
                UserId = id
            };
            var result = await _mediator.Send(command, cancellationToken);
            return HandleResult(result);
        }
        #endregion
    }
}
