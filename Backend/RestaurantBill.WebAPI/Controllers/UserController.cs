using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        public UserController(IUserService userService)
        {
            _userService = userService;
        }

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
        [HttpPost("create-user")]
        public async Task<IActionResult> CreateUser([FromBody]CreateUserDto dto, CancellationToken cancellationToken)
        {
            await _userService.CreateAsync(dto, cancellationToken);
            return Ok("Kullanıcı başarıyla oluşturuldu");
        }

        [HttpPut("update-user")]
        public async Task<IActionResult> UpdateUser([FromBody]UpdateUserDto dto, CancellationToken cancellationToken)
        {
            await _userService.UpdateAsync(dto, cancellationToken);
            return Ok("Kullanıcı başarıyla güncellendi");
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _userService.DeleteAsync(id, cancellationToken);
            return Ok("Kullanıcı başarıyla silindi");
        }
    }
}
