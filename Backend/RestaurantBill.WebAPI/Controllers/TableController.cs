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
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTableById([FromRoute]int id)
        {
            var table = await _tableService.GetByIdAsync(id);
            return Ok(table);
        }
        [HttpPost("create-table")]
        public async Task<IActionResult> CreateTable([FromBody]CreateTableDto dto, CancellationToken cancellationToken)
        {
            await _tableService.CreateAsync(dto, cancellationToken);
            return Ok("Masa başarıyla oluşturuldu");
        }

        [HttpPut("update-Table")]
        public async Task<IActionResult> UpdateTable([FromBody]UpdateTableDto dto, CancellationToken cancellationToken)
        {
            await _tableService.UpdateAsync(dto, cancellationToken);
            return Ok("Masa başarıyla güncellendi");
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTable([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _tableService.DeleteAsync(id, cancellationToken);
            return Ok("Masa başarıyla silindi");
        }
    }
}
