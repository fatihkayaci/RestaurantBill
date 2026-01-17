using AutoMapper;
using RestaurantBill.Core;
using RestaurantBill.Core.DTOs;

namespace RestaurantBill.Business.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<CreateProductDto, Product>();
        CreateMap<Product, ProductResponse>();
        
        CreateMap<CreateCategoryDto, Category>();
        CreateMap<Category, ResponseCategoryDto>();
        
        CreateMap<CreateTableDto, Table>();
        CreateMap<Table, TableResponse>();

        CreateMap<CreateOrderDto, Order>();
        CreateMap<Order, OrderResponse>();

        CreateMap<CreateOrderItemDto, OrderItem>();
        CreateMap<OrderItem, OrderItemResponse>();
        
        // İpucu: Eğer tersine de dönüşüm lazımsa .ReverseMap() ekleyebilirsin.
        // CreateMap<Product, ProductUpdateDto>().ReverseMap();
    }
}