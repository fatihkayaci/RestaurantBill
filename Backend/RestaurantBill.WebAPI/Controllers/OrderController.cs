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
        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody]CreateOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Created("", new { Message = "Sipariş başarıyla oluşturuldu." });
        }
        #endregion

        #region method for put
        [HttpPut("update-order")]
        public async Task<IActionResult> UpdateOrder([FromBody]UpdateOrderStatusCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Siparişiniz güncellendi." });
        }

        [HttpPut("remove-product")]
        public async Task<IActionResult> RemoveProduct([FromBody]RemoveProductFromOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Siparişinizden ürün çıkarıldı." });
        }

        [HttpPut("cancel-order")]
        public async Task<IActionResult> CancelOrder([FromBody]CancelOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Siparişiniz iptal oldu." });
        }
        [HttpPut("close-order")]
        public async Task<IActionResult> CloseOrder([FromBody]CloseOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Siparişiniz kapatıldı." });
        }
        [HttpPut("add-product")]
        public async Task<IActionResult> AddProductToOrder([FromBody] AddProductToOrderCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Siparişinize yeni ürün eklendi." });
        }
        [HttpPut("move-table")]
        public async Task<IActionResult> MoveOrderToTable([FromBody] MoveOrderToTableCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return Ok(new { Message = "Sipariş yeni masaya başarıyla taşındı!" });
        }
        
        /*extra use for Move Table
        [HttpPut("{orderId}/move/{newTableId}")]
        public async Task<IActionResult> MoveOrderToTable([FromRoute]int orderId, [FromRoute]int newTableId)
        {
            var command = new MoveOrderToTableCommand 
            { 
                OrderId = orderId, 
                TableId = newTableId 
            };
            await _mediator.Send(command);
            return Ok(new { Message = "Sipariş başarıyla yeni masaya taşındı." });
        }*/
        
        #endregion
    }
}
