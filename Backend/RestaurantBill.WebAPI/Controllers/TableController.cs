using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrders;
using RestaurantBill.Application.Features.Tables.Commands.CreateTable;
using RestaurantBill.Application.Features.Tables.Commands.OpenTable;
using RestaurantBill.Application.Features.Tables.Queries.GetAll;
using RestaurantBill.Application.Features.Tables.Queries.GetTableById;
namespace RestaurantBill.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TableController : ControllerBase
    {
        
        private readonly IMediator _mediator;
        public TableController(IMediator mediator)
        {
            _mediator = mediator;
        }

        #region get methods
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllTableQuery();
            var values = await _mediator.Send(query);
            return Ok(values);
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTableById([FromRoute]int id)
        {
            var query = new GetTableByIdQuery
            {
                TableId = id
            };
            var table = await _mediator.Send(query);
            return Ok(table);
        }
        #endregion

        #region post methods
        [HttpPost("create")]
        public async Task<IActionResult> CreateTable([FromBody]CreateTableCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Masa başarıyla oluşturuldu");
        }

        [HttpPost("{id}/open")]
        public async Task<IActionResult> OpenTable([FromRoute]int id, CancellationToken cancellationToken)
        {
            var command = new OpenTableCommand { TableId = id };
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masa Durumu başarıyla güncellendi." });
        }      
        #endregion

        #region patch methods
        
        #endregion
        
        #region put methods
                  
        #endregion

        /*
            #region post
            
                
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
        
        */

    }
}
