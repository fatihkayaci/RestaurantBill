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
    public class UserController : ControllerBase
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
            UserDto user = await _mediator.Send(new GetCurrentUserQuery());
            return Ok(user);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetUserByRestaurantId()
        {
            var query = new GetUserByRestaurantIdCommand();
            var users = await _mediator.Send(query);
            return Ok(users);
        }
            
        #endregion
        #region post methods
        /// <summary>
        /// Creates a new user and associates them with the authenticated user's restaurant.
        /// </summary>
        /// <param name="command">User creation details containing FullName, UserName, Email, PhoneNumber, PasswordHash, UserCode and Role.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        
        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> CreateUser([FromBody]CreateUserCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Kullanıcı başarıyla oluşturuldu");
        }
        /// <summary>
        /// Creates a new user and associates them with the authenticated user's restaurant.
        /// </summary>
        /// <param name="command">User creation details containing FullName, UserName, Email, PhoneNumber, PasswordHash, UserCode and Role.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        
        [Authorize(Roles = "Admin")]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateUser([FromBody]UpdateUserCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Kullanıcı başarıyla oluşturuldu");
        }
            
        #endregion
        #region delete methods
        /// <summary>
        /// Deletes a user by their ID.
        /// </summary>
        /// <param name="id">The ID of the user to delete.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on deletion.</returns>
        
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser([FromRoute]string id, CancellationToken cancellationToken)
        {
            var command = new DeleteUserCommand
            {
                UserId = id
            };
            await _mediator.Send(command, cancellationToken);
            return Ok("Kullanıcı başarıyla silindi");
        }
        #endregion
    }
}
