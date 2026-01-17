using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;

namespace RestaurantBill.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderItemController : ControllerBase
    {
        private readonly IOrderItemService _orderItemService;
        public OrderItemController(IOrderItemService orderItemService)
        {
            _orderItemService = orderItemService;
        }
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var values = await _orderItemService.GetAllAsync();
            return Ok(values);
        }
        [HttpPost]
        public async Task<IActionResult> Add(CreateOrderItemDto orderItemDto)
        {
            await _orderItemService.AddAsync(orderItemDto);
            return Ok("Order Item başarıyla eklendi");
        }
    }
}
