using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IProductService
{
    Task CreateAsync(CreateProductDto dto, CancellationToken cancellationToken); 
    Task<List<ProductDto>> GetAllAsync();
    Task UpdateAsync(UpdateProductDto dto, CancellationToken cancellationToken);
    Task<ProductDto> GetByIdAsync(int id);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
