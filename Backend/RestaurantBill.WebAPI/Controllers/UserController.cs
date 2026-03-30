using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.DeleteUser;
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
        [HttpGet]
        public async Task<IActionResult> GetUserByRestaurantId()
        {
            var query = new GetUserByRestaurantIdCommand();
            var users = await _mediator.Send(query);
            return Ok(users);
        }
        [HttpPost("create")]
        public async Task<IActionResult> CreateUser([FromBody]CreateUserCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Kullanıcı başarıyla oluşturuldu");
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser([FromRoute]int id, CancellationToken cancellationToken)
        {
            var command = new DeleteUserCommand
            {
                UserId = id
            };
            await _mediator.Send(command, cancellationToken);
            return Ok("Kullanıcı başarıyla silindi");
        }
    /*
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById([FromRoute]int id)
        {
            var user = await _userService.GetByIdAsync(id);
            return Ok(user);
        }
        

        [HttpPut("update-user")]
        public async Task<IActionResult> UpdateUser([FromBody]UpdateUserDto dto, CancellationToken cancellationToken)
        {
            await _userService.UpdateAsync(dto, cancellationToken);
            return Ok("Kullanıcı başarıyla güncellendi");
        }
        */
    }
}
