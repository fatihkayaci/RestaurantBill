using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;
using AutoMapper;

namespace RestaurantBill.Business.Services;

public class OrderService : IOrderService
{
    private readonly IGenericRepository<Order> _repository;
    private readonly IMapper _mapper;
    public OrderService(IGenericRepository<Order> repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }
    public async  Task AddAsync(CreateOrderDto dto)
    {
        var order = _mapper.Map<Order>(dto);
        
        await _repository.AddAsync(order);
    }
    async Task<List<OrderResponse>> IOrderService.GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return _mapper.Map<List<OrderResponse>>(entities);
    }
}