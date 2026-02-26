using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Services;

public class OrderService //: IOrderService
{
    private readonly IMapper _mapper;
    private readonly IUnitOfWork _uow;

    public OrderService(IMapper mapper, IUnitOfWork uow)
    {
        _mapper = mapper;
        _uow = uow;
    }
    public async Task<List<OrderDto>> GetAllAsync()
    {
        var entities = await _uow.Order.GetAllAsync();
        return _mapper.Map<List<OrderDto>>(entities);
    }
    public async Task<OrderDto> GetByIdAsync(int id)
    {
        if (id <= 0)
            throw new BusinessException("id 0 dan küçük veya eşit olamaz");
        var order = await _uow.Order.GetByIdAsync(id);
        
        Guard.AgainstNull(order, "Böyle bir Ürün bulunamadı.");
        
        return _mapper.Map<OrderDto>(order);
    }
    



    /*bitenler*/
    public async Task AddProductToOrderAsync(int orderId, CreateOrderItemDto dto)
    {
        if (dto.Quantity <= 0) throw new BusinessException("Miktar 0'dan büyük olmalı!");

        var order = await _uow.Order.GetByIdAsync(orderId, true, o => o.OrderItems);
        Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

        var product = await _uow.Product.GetByIdAsync(dto.ProductId);
        Guard.AgainstNull(product, "Böyle bir sipariş bulunamadı.");

        var existingItem = order.OrderItems.FirstOrDefault(x => x.ProductId == dto.ProductId);

        if (existingItem != null)
            existingItem.Quantity += dto.Quantity; 
        else
        {
            var newItem = _mapper.Map<OrderItem>(dto);
            newItem.UnitPrice = product.Price; 
            order.OrderItems.Add(newItem); 
        }

        order.TotalPrice = order.OrderItems.Sum(item => item.UnitPrice * item.Quantity);
        await _uow.SaveChangesAsync();
    }
    public async Task CreateAsync(CreateOrderDto dto)
    {
        if (dto == null)
            throw new BusinessException("Eklenecek veri boş olamaz");
        if (dto.TableId <= 0)
            throw new BusinessException("Table Id 0 veya daha küçük bir şey olamaz");
        
        var table = await _uow.Table.GetByIdAsync(dto.TableId, true);
        
        Guard.AgainstNull(table, "Böyle bir Masa bulunamadı.");

        if (table.Status != TableStatus.Available)
            throw new BusinessException("Bu masa dolu yeni sipariş oluşturulamıyor");
        
        var order = _mapper.Map<Order>(dto);
        await _uow.Order.AddAsync(order);
        table.Status = TableStatus.Occupied;

        await _uow.SaveChangesAsync();
    }
    public async Task MoveOrderToTableAsync(int orderId, int newTableId)
    {
        if (orderId <= 0 || newTableId <= 0) throw new BusinessException("id 0 dan küçük veya eşit olamaz");
        
        var order = await _uow.Order.GetByIdAsync(orderId, true);
        Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

        var newTable = await _uow.Table.GetByIdAsync(newTableId, true);
        Guard.AgainstNull(newTable, "Böyle bir Masa bulunamadı.");
        
        if (newTable.Status != TableStatus.Available) throw new BusinessException("Hedef masa şu an dolu, sipariş taşınamaz!");

        var oldTable = await _uow.Table.GetByIdAsync(order.TableId, true);
        if (oldTable != null)
            oldTable.Status = TableStatus.Available;

        order.TableId = newTableId;
        newTable.Status = TableStatus.Occupied;
        await _uow.SaveChangesAsync();
    }
    public async Task CancelOrderAsync(int orderId)
    {
        if (orderId <= 0)
            throw new BusinessException("id 0 dan küçük veya eşit olamaz");
        
        var order = await _uow.Order.GetByIdAsync(orderId, true);
        Guard.AgainstNull(order, "Böyle bir Ürün bulunamadı.");

        order.Status = OrderStatus.Cancelled;
        await _uow.SaveChangesAsync();
    }
    public async Task CloseOrderAsync(int orderId)
    {
        if (orderId <= 0)
            throw new BusinessException("id 0 dan küçük veya eşit olamaz");
        
        var order = await _uow.Order.GetByIdAsync(orderId, true);
        Guard.AgainstNull(order, "Böyle bir Ürün bulunamadı.");
        
        order.Status = OrderStatus.Paid;

        var table = await _uow.Table.GetByIdAsync(order.TableId, true);
        if (table != null)
            table.Status = TableStatus.Available;

        await _uow.SaveChangesAsync();
    }
    public async Task RemoveProductFromOrderAsync(int orderId, RemoveOrderItemDto dto)
    {
        var order = await _uow.Order.GetByIdAsync(orderId, true, o => o.OrderItems);
        Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

        var existingItem = order.OrderItems.FirstOrDefault(x => x.ProductId == dto.ProductId);
        Guard.AgainstNull(existingItem, "İptal etmek istediğiniz ürün zaten bu siparişte yok!");

        if (dto.QuantityToRemove >= existingItem.Quantity) order.OrderItems.Remove(existingItem);
        else existingItem.Quantity -= dto.QuantityToRemove;

        order.TotalPrice = order.OrderItems.Sum(item => item.UnitPrice * item.Quantity);

        await _uow.SaveChangesAsync();
    }
    public async Task UpdateOrderStatusAsync(int orderId, OrderStatus newStatus)
    {

        if (orderId <= 0)
            throw new BusinessException("id 0 dan küçük veya eşit olamaz");

        var order = await _uow.Order.GetByIdAsync(orderId, true);
        Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");
        
        order.Status = newStatus;

        await _uow.SaveChangesAsync();
    }
}