using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;
using AutoMapper;
using RestaurantBill.Infrastructure.Repositories;

namespace RestaurantBill.Business.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IGenericRepository<OrderItem> _orderItemRepository;
    private readonly IGenericRepository<Table> _tableRepository;
    private readonly IMapper _mapper;
    public OrderService(
        IOrderRepository orderRepository,
        IGenericRepository<OrderItem> orderItemRepository,
        IGenericRepository<Table> tableRepository,
        IMapper mapper
        )
    {
        _orderRepository = orderRepository;
        _orderItemRepository = orderItemRepository;
        _tableRepository = tableRepository;
        _mapper = mapper;
    }
    public async  Task AddAsync(CreateOrderDto dto)
    {
        var order = _mapper.Map<Order>(dto);
        await _orderRepository.AddAsync(order);
    }
    public async Task DeleteOrderDetailAsync(int id)
    {
        var orderItem = await _orderItemRepository.GetByIdAsync(id);
        if (orderItem == null) throw new Exception("Silinecek ürün bulunamadı.");

        var order = await _orderRepository.GetByIdAsync(orderItem.OrderId);
        if (order == null) throw new Exception("Bağlı olduğu sipariş bulunamadı.");

        order.TotalPrice -= orderItem.Price;
        if (order.TotalPrice < 0) order.TotalPrice = 0;
        await _orderRepository.UpdateAsync(order);
        await _orderItemRepository.DeleteAsync(id);
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
    public async Task CloseOrderAsync(int id)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null) throw new Exception("Sipariş bulunamadı");
        order.Status = OrderStatus.Paid;

        var table = await _tableRepository.GetByIdAsync(order.TableId);
        if (table == null) throw new Exception("Masa bulunamadı");
        table.Status = TableStatus.Available;

        await _tableRepository.UpdateAsync(table);
        await _orderRepository.UpdateAsync(order);

    }
    public async Task<OrderResponse> GetActiveOrderByTableIdAsync(int tableId)
    {
        var table = await _tableRepository.GetByIdAsync(tableId);
        if (table == null) throw new Exception("Masa bulunamadı");

        var order = await _orderRepository.GetActiveOrderByTableId(tableId);
        return _mapper.Map<OrderResponse>(order);
    }
}