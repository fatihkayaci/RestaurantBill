using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;
using AutoMapper;

namespace RestaurantBill.Business.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IMapper _mapper;
    public OrderService(
        IOrderRepository orderRepository, 
        IMapper mapper)
    {
        _orderRepository = orderRepository;
        _mapper = mapper;
    }
    public async  Task AddAsync(CreateOrderDto dto)
    {
        var order = _mapper.Map<Order>(dto);
        await _orderRepository.AddAsync(order);
    }

    public async Task<List<OrderResponse>> GetAllAsync()
    {
        var entities = await _orderRepository.GetAllAsync();
        return _mapper.Map<List<OrderResponse>>(entities);
    }
    public async Task<OrderResponse> GetOrderDetailsAsync(int id)
    {
        var order = await _orderRepository.GetOrderWithDetailsAsync(id);
        if (order == null) throw new Exception("Sipariş bulunamadı");
        return _mapper.Map<OrderResponse>(order);
    }
}