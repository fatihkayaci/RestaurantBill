using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Tables.Commands.CancelReservation;
using RestaurantBill.Application.Features.Tables.Commands.CreateTable;
using RestaurantBill.Application.Features.Tables.Commands.OpenTable;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
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
        /// <summary>
        /// Returns all tables.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllTableQuery();
            var values = await _mediator.Send(query);
            return Ok(values);
        }
        /// <summary>
        /// Returns a table by its ID.
        /// </summary>
        /// <param name="id">TableId</param>
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
        /// <summary>
        /// Creates a new table.
        /// </summary>
        /// <param name="command"></param>
        /// <param name="cancellationToken"></param>
        [HttpPost("create")]
        public async Task<IActionResult> CreateTable([FromBody]CreateTableCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Masa başarıyla oluşturuldu");
        }
        /// <summary>
        /// Opens the table when a customer arrives. Sets status to Occupied and creates an empty order.
        /// </summary>
        /// <param name="command">TableId</param>
        /// <param name="cancellationToken"></param>
        [HttpPost("open")]
        public async Task<IActionResult> OpenTable([FromBody]OpenTableCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masa Durumu başarıyla güncellendi." });
        }
        /// <summary>
        /// Reserves the table. Sets status to Reserved.
        /// </summary>
        /// <param name="command">TableId</param>
        /// <param name="cancellationToken"></param>
        [HttpPost("reservation")]
        public async Task<IActionResult> ReservationTable([FromBody]ReservationTableCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masa Durumu başarıyla güncellendi." });
        }
        /// <summary>
        /// Cancels the reservation and sets the table status back to Available.
        /// </summary>
        /// <param name="command">TableId</param>
        /// <param name="cancellationToken"></param>
        [HttpPost("cancel-reservation")]
        public async Task<IActionResult> CancelReservationTable([FromBody]CancelReservationCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masa Durumu başarıyla güncellendi." });
        }      
        #endregion
    }
}
