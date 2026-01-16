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
        
        // İpucu: Eğer tersine de dönüşüm lazımsa .ReverseMap() ekleyebilirsin.
        // CreateMap<Product, ProductUpdateDto>().ReverseMap();
    }
}