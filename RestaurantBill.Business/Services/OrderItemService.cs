using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;
using AutoMapper;

namespace RestaurantBill.Business.Services;

public class OrderItemService : IOrderItemService
{
    private readonly IGenericRepository<OrderItem> _repository;
    private readonly IMapper _mapper;
    public OrderItemService(IGenericRepository<OrderItem> repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }
    public async Task AddAsync(CreateOrderItemDto dto)
    {
        var orderItem = _mapper.Map<OrderItem>(dto);
        await _repository.AddAsync(orderItem);
    }

    public async Task<List<OrderItemResponse>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return _mapper.Map<List<OrderItemResponse>>(entities);
    }
}