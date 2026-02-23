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
            var values = await _userService.GetAllAsync();
            return Ok(values);
        }

        [HttpPost]
        public async Task<IActionResult> Add(CreateUserDto userDto)
        {
            await _userService.CreateAsync(userDto);
            return Ok("User başarıyla eklendi");
        }
    }
}
