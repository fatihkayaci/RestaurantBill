using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

#region commands and queries
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Orders.Commands.MoveOrderToTable;
using RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrders;
using RestaurantBill.Application.Features.Orders.Queries.GetOrderById;
#endregion

namespace RestaurantBill.WebAPI.Controllers
{
    // [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly IMediator _mediator;

        public OrderController(IMediator mediator)
        {
            _mediator = mediator;
        }
        #region methods for get
        [HttpGet]
        public async Task<IActionResult> GetAllOrders()
        {
            var query = new GetAllOrdersQuery();
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderById([FromRoute]int id, CancellationToken cancellationToken)
        {
            var query = new GetOrderByIdQuery
            {
                OrderId = id
            };
            var result = await _mediator.Send(query, cancellationToken);
            return Ok(result);
        }
        [HttpGet("table/{tableId:int}")]
        public async Task<IActionResult> GetActiveOrderByTableId([FromRoute]int tableId, CancellationToken cancellationToken)
        {
            var query = new GetActiveOrderByTableIdQuery{TableId = tableId};
            var result = await _mediator.Send(query, cancellationToken);
            return Ok(result);
        }
        #endregion
        
        #region methods for post
        [HttpPost]
        public async Task<IActionResult> Create([FromBody]CreateOrderCommand command, CancellationToken cancellationToken)
        {
            var newOrder = await _mediator.Send(command, cancellationToken);
            return Created("", newOrder);
        }
        [HttpPost("cancel")]
        public async Task<IActionResult> Cancel([FromBody]CancelOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masa Durumu başarıyla güncellendi." });
        }
        #endregion
    }
}
