using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IProductService
{
    Task AddAsync(CreateProductDto dto); 
    Task<List<ProductResponse>> GetAllAsync();
}
