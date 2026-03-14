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
        #region get methods
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
            
        #endregion
       
        #region post
        [HttpPost]
        public async Task<IActionResult> CreateTable([FromBody]CreateTableDto dto, CancellationToken cancellationToken)
        {
            await _tableService.CreateAsync(dto, cancellationToken);
            return Ok("Masa başarıyla oluşturuldu");
        }
            
        #endregion
       
        #region put methods
        [HttpPut("update-Table")]
        public async Task<IActionResult> UpdateTable([FromBody]UpdateTableDto dto, CancellationToken cancellationToken)
        {
            await _tableService.UpdateAsync(dto, cancellationToken);
            return Ok("Masa başarıyla güncellendi");
        }            
        #endregion
        #region patch methods
        [HttpPatch("{tableId}")]
        public async Task<IActionResult> ChangeStatus([FromRoute]int tableId, [FromBody] ChangeTableStatusDto statusDto, CancellationToken cancellationToken)
        {
            await _tableService.ChangeTableStatus(tableId, statusDto, cancellationToken);
            return Ok("masanın durumu değiştirildi.");
        }
        #endregion

        #region delete methods
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTable([FromRoute]int id, CancellationToken cancellationToken)
        {
            await _tableService.DeleteAsync(id, cancellationToken);
            return Ok("Masa başarıyla silindi");
        }
            
        #endregion
    }
}
