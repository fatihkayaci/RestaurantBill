using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable;
using RestaurantBill.Application.Features.Tables.Commands.CreateTable;
using RestaurantBill.Application.Features.Tables.Commands.DeleteTable;
using RestaurantBill.Application.Features.Tables.Commands.OpenTable;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
using RestaurantBill.Application.Features.Tables.Commands.UpdateTable;
using RestaurantBill.Application.Features.Tables.Queries.GetAllTable;
using RestaurantBill.Application.Features.Tables.Queries.GetTableById;
namespace RestaurantBill.WebAPI.Controllers
{
    
    [Authorize]
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
        [Authorize(Roles = "Admin,Waiter,Kitchen")]
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
        [Authorize(Roles = "Admin,Waiter,Kitchen")]
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
        /// Creates a new table. Only accessible by Admin.
        /// </summary>
        /// <param name="command">Table creation details containing capacity and table number.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on creation.</returns>
        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> CreateTable([FromBody]CreateTableCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Masa başarıyla oluşturuldu");
        }
        /// <summary>
        /// Updates an existing table. Only accessible by Admin.
        /// </summary>
        /// <param name="command">Table update details containing Id and updated fields.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on update.</returns>
        [Authorize(Roles = "Admin")]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateTable([FromBody]UpdateTableCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok("Masa başarıyla Güncellendi");
        }
        /// <summary>
        /// Opens the table when a customer arrives. Sets status to Occupied and creates an empty order.
        /// </summary>
        /// <param name="command">TableId</param>
        /// <param name="cancellationToken"></param>
        [Authorize(Roles = "Admin,Waiter")]
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
        [Authorize(Roles = "Admin,Waiter")]
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
        [Authorize(Roles = "Admin,Waiter")]
        [HttpPost("cancel-reservation")]
        public async Task<IActionResult> CancelReservationTable([FromBody]CancelReservationCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masa Durumu başarıyla güncellendi." });
        }      
        #endregion

        #region delete methods
        /// <summary>
        /// Deletes a table by its ID. Only accessible by Admin.
        /// </summary>
        /// <param name="id">The ID of the table to delete.</param>
        /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
        /// <returns>200 OK with success message on deletion.</returns>
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
        {
            var command = new DeleteTableCommand
            {
                TableId = id
            };
            await _mediator.Send(command, cancellationToken);
            return Ok(new {message="Masa başarıyla silindi"});
        }
        #endregion
    }
}
