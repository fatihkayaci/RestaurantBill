using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
namespace RestaurantBill.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TableController : ControllerBase
    {
        private readonly ITableService _tableService;
        public TableController(ITableService tableService)
        {
            _tableService = tableService;
        }
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var values = await _tableService.GetAllAsync();
            return Ok(values);
        }
        [HttpPost]
        public async Task<IActionResult> Add(CreateTableDto tableDto)
        {
            await _tableService.CreateAsync(tableDto);
            return Ok("masa başarıyla eklendi");
        }
    }
}
