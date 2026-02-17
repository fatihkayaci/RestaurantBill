using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Business.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Product
        CreateMap<ProductDto, Product>().ReverseMap();
        CreateMap<CreateProductDto, Product>().ReverseMap();
        CreateMap<UpdateProductDto, Product>().ReverseMap();

        // Order
        CreateMap<OrderDto, Order>().ReverseMap();
        CreateMap<CreateOrderDto, Order>().ReverseMap();
        CreateMap<UpdateOrderDto, Order>().ReverseMap();

        // OrderItem (En kritik yer burası)
        CreateMap<OrderItemDto, OrderItem>().ReverseMap();
        CreateMap<CreateOrderItemDto, OrderItem>().ReverseMap();
        CreateMap<UpdateOrderItemDto, OrderItem>().ReverseMap();

        // Category
        CreateMap<CategoryDto, Category>().ReverseMap();
        CreateMap<CreateCategoryDto, Category>().ReverseMap();
        CreateMap<UpdateCategoryDto, Category>().ReverseMap();

        // Table
        CreateMap<TableDto, Table>().ReverseMap();
        CreateMap<CreateTableDto, Table>().ReverseMap();
        CreateMap<UpdateTableDto, Table>().ReverseMap();

        // User
        CreateMap<UserDto, User>().ReverseMap();
        CreateMap<CreateUserDto, User>().ReverseMap();
        CreateMap<UpdateUserDto, User>().ReverseMap();

        // Restaurant
        CreateMap<RestaurantDto, Restaurant>().ReverseMap();
        CreateMap<CreateRestaurantDto, Restaurant>().ReverseMap();
        CreateMap<UpdateRestaurantDto, Restaurant>().ReverseMap();
    }
}