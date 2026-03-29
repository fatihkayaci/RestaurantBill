using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

#region commands and queries
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity;
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

        /// <summary> Returns all orders.</summary>
        [HttpGet]
        public async Task<IActionResult> GetAllOrders()
        {
            var query = new GetAllOrdersQuery();
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        
        /// <summary> Returns an order by its ID. </summary>
        /// <param name="id">Order ID</param>
        /// <param name="cancellationToken"></param>
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
        /// <summary> Returns the active order for the given table. </summary>
        /// <param name="tableId">Table ID</param>
        /// <param name="cancellationToken"></param>
        [HttpGet("table/{tableId:int}")]
        public async Task<IActionResult> GetActiveOrderByTableId([FromRoute]int tableId, CancellationToken cancellationToken)
        {
            var query = new GetActiveOrderByTableIdQuery{TableId = tableId};
            var result = await _mediator.Send(query, cancellationToken);
            return Ok(result);
        }
        #endregion
        
        #region methods for post
        /// <summary> Adds products to an order or updates quantity if the product already exists. </summary>
        /// <param name="command"></param>
        /// <param name="cancellationToken"></param>
        [HttpPost("add-product")]
        public async Task<IActionResult> AddProducts([FromBody] AddProductToOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masaya ürünler eklendi veya güncellendi." });
        }
        /// <summary> Cancels the entire order and releases the table. </summary>
        /// <param name="command"></param>
        /// <param name="cancellationToken"></param>
        [HttpPost("cancel")]
        public async Task<IActionResult> Cancel([FromBody]CancelOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masa Durumu başarıyla güncellendi." });
        }
        /// <summary> Closes the order, marks it as paid and sets the table to available. </summary>
        /// <param name="command"></param>
        /// <param name="cancellationToken"></param>
        [HttpPost("close")]
        public async Task<IActionResult> Close([FromBody]DeleteCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Masa başarılı bir şekilde kapatıldı." });
        }
        /// <summary> Creates a new order for a table. </summary>
        /// <param name="command"></param>
        /// <param name="cancellationToken"></param>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody]CreateOrderCommand command, CancellationToken cancellationToken)
        {
            var newOrder = await _mediator.Send(command, cancellationToken);
            return Created("", newOrder);
        }
        /// <summary> Updates the quantity of a specific item in the order. Only Pending items can be updated. </summary>
        /// <param name="command"></param>
        /// <param name="cancellationToken"></param>
        [HttpPost("item/quantity")]
        public async Task<IActionResult> UpdateOrderItemQuantity([FromBody]UpdateOrderItemQuantityCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Ürün başarıyla güncellendi."});
        }
        
        /// <summary> Removes a specific product from the order. Only Pending items can be removed. </summary>
        /// <param name="command"></param>
        /// <param name="cancellationToken"></param>
        [HttpPost("item/remove")]
        public async Task<IActionResult> RemoveProductFromOrder([FromBody]RemoveProductFromOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "siparişten ürün başarıyla kaldırıldi." });
        }
        
        #endregion
    }
}
