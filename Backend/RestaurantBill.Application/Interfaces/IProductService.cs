using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IProductService
{
    Task CreateAsync(CreateProductDto dto); 
    Task<List<ProductDto>> GetAllAsync();
}
