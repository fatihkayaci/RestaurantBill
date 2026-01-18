using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;
using AutoMapper;

namespace RestaurantBill.Business.Services;

public class OrderItemService : IOrderItemService
{
    private readonly IGenericRepository<OrderItem> _repository;
    private readonly IGenericRepository<Order> _orderRepository;
    private readonly IGenericRepository<Product> _productRepository;
    private readonly IMapper _mapper;
    public OrderItemService(
        IGenericRepository<OrderItem> repository,
        IGenericRepository<Order> orderRepository, 
        IGenericRepository<Product> productRepository, 
        IMapper mapper)
    {
        _repository = repository;
        _orderRepository = orderRepository;
        _productRepository = productRepository;
        _mapper = mapper;
    }
    public async Task AddAsync(CreateOrderItemDto dto)
    {
        var order = await _orderRepository.GetByIdAsync(dto.OrderId);
        if (order == null) 
            throw new Exception("Sipariş bulunamadı!");
        if (order.Status == OrderStatus.Paid)
            throw new Exception("Ödenmiş siparişe ekleme yapılamaz!");

        var product = await _productRepository.GetByIdAsync(dto.ProductId);
        if (product == null) 
            throw new Exception("Böyle bir ürün bulunamadı!");
        
        var orderItem = _mapper.Map<OrderItem>(dto);
        orderItem.Price = product.Price;
        await _repository.AddAsync(orderItem);
        
        if(order != null) 
        {
            order.TotalPrice += (orderItem.Price * orderItem.Quantity);
            await _orderRepository.UpdateAsync(order); 
        }
        
    }

    public async Task<List<OrderItemResponse>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return _mapper.Map<List<OrderItemResponse>>(entities);
    }
}