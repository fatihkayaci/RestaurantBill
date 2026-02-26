using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly IMediator _mediator;

        public OrderController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            // DTO'dan Command'a dönüştür (Mapping)
            var command = new CreateOrderCommand 
            {
                TableId = dto.TableId,
                Note = dto.Note
            };

            // MediatR'a yolla, Handler çalışsın, ID geri gelsin!
            var orderId = await _mediator.Send(command);
            
            return Ok(new { Message = "Sipariş başarıyla açıldı", OrderId = orderId });
        }
    /*
        [HttpPost("{orderId}/items")]
        public async Task<IActionResult> AddProductToOrder(int orderId, [FromBody] CreateOrderItemDto dto)
        {
            var command = new AddProductToOrderCommand
            {
                OrderId = orderId,
                ProductId = dto.ProductId,
                Quantity = dto.Quantity
            };

            await _mediator.Send(command);

            return Ok(new { Message = "Ürün siparişe eklendi." });
        }*/
        #region old code
        /*
            [HttpGet]
            public async Task<IActionResult> GetAll()
            {
                var values = await _orderService.GetAllAsync();
                return Ok(values);
            }
            [HttpPost]
            public async Task<IActionResult> Add(CreateOrderDto orderDto)
            {
                await _orderService.CreateAsync(orderDto);
                return Ok("Order başarıyla eklendi");
            }
            [HttpPost("close-order/{id}")]
            public async Task<IActionResult> CloseOrder(int id)
            {
                await _orderService.CloseOrderAsync(id);
                return Ok("işlem başarıyla tamamlandı.");
            }
            [HttpGet("details/{id}")]
            public async Task<IActionResult> GetOrderDetails(int id)
            {
                var response = await _orderService.GetOrderDetailsAsync(id);
                return Ok(response);
            }
            [HttpDelete]
            public async Task<IActionResult> DeleteOrderItem(int id)
            {
                await _orderService.DeleteOrderDetailAsync(id);
                return Ok("Order item başarıyla silindi");
            }
            
            [HttpGet("table/{tableId}")]
            public async Task<IActionResult> GetActiveOrderByTableId(int tableId)
            {
                var response = await _orderService.GetActiveOrderByTableIdAsync(tableId);
                return Ok(response);
            }
        */  
        #endregion
    }
}
