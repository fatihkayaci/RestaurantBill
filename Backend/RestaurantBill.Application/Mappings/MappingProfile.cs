using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Restaurants.Commands.UpdateRestaurant;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Business.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Product
        CreateMap<ProductDto, Product>().ReverseMap();

        // Order
        CreateMap<OrderDto, Order>().ReverseMap();
        CreateMap<CreateOrderCommand, Order>().ReverseMap();

        // OrderItem
        CreateMap<OrderItemDto, OrderItem>().ReverseMap();
        CreateMap<CreateOrderItemDto, OrderItem>().ReverseMap();

        // Category
        CreateMap<CategoryDto, Category>().ReverseMap();

        // Table
        CreateMap<TableDto, Table>().ReverseMap();

        // CashRegister
        CreateMap<CashRegisterDto, CashRegister>().ReverseMap();
        CreateMap<CashTransactionDto, CashRegister.CashTransaction>().ReverseMap();

        // User
        CreateMap<UserDto, User>().ReverseMap();
        CreateMap<CreateUserDto, User>().ReverseMap();
        CreateMap<UpdateUserDto, User>().ReverseMap();

        // Restaurant
        CreateMap<RestaurantDto, Restaurant>().ReverseMap();
    }
}
