using RestaurantBill.Core.DTOs;
namespace RestaurantBill.Core.Interfaces;

public interface IProductService
{
    Task AddAsync(CreateProductDto dto); 
    Task<List<ProductResponse>> GetAllAsync();
}
