using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain;

namespace RestaurantBill.Business.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<CreateProductDto, Product>();
        CreateMap<Product, ProductResponse>();

        CreateMap<CreateOrderDto, Order>();
        CreateMap<Order, OrderResponse>();

        CreateMap<CreateOrderItemDto, OrderItem>();
        CreateMap<OrderItem, OrderItemResponse>();

        // CreateMap<CreateCategoryDto, Category>();
        // CreateMap<Category, ResponseCategoryDto>();
        
        // CreateMap<CreateTableDto, Table>();
        // CreateMap<Table, TableResponse>();


        // CreateMap<CreateUserDto, User>();
        // CreateMap<User, UserResponse>();
    }
}