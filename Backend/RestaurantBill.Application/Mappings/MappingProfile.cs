using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Restaurants.Commands.CreateRestaurant;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Business.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Product
        CreateMap<ProductDto, Product>().ReverseMap();
        CreateMap<CreateProductCommand, Product>().ReverseMap();
        CreateMap<UpdateProductCommand, Product>().ReverseMap();

        // Order
        CreateMap<OrderDto, Order>().ReverseMap();
        CreateMap<CreateOrderCommand, Order>().ReverseMap();
        
        #region if database column name different than createOrderCommand use this way.
        /*
            dest (Destination) for order
            src (source) for command

            CreateMap<CreateOrderCommand, Order>()
            .ForMember(dest => dest.TableId, opt => opt.MapFrom(src => src.MasaNo))
            .ForMember(dest => dest.Note, opt => opt.MapFrom(src => src.MusteriNotu))
            .ReverseMap(); 
        */
        #endregion

        // OrderItem (En kritik yer burası)
        CreateMap<OrderItemDto, OrderItem>().ReverseMap();
        CreateMap<CreateOrderItemDto, OrderItem>().ReverseMap();

        // Category
        CreateMap<CategoryDto, Category>().ReverseMap();
        CreateMap<CreateCategoryCommand, Category>().ReverseMap();
        CreateMap<UpdateCategoryCommand, Category>().ReverseMap();

        // Table
        CreateMap<TableDto, Table>().ReverseMap();

        // CashRegister
        CreateMap<CashRegisterDto, CashRegister>().ReverseMap();

        // User
        CreateMap<UserDto, User>().ReverseMap();
        CreateMap<CreateUserDto, User>().ReverseMap();
        CreateMap<UpdateUserDto, User>().ReverseMap();
        CreateMap<CreateUserCommand, User>().ReverseMap();

        // Restaurant
        CreateMap<RestaurantDto, Restaurant>().ReverseMap();
        CreateMap<CreateRestaurantCommand, Restaurant>().ReverseMap();

        
    }
}