using System.Linq;
using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;

namespace RestaurantBill.Business.Services;

public class ProductService : IProductService
{
    private readonly IGenericRepository<Product> _repository;
    public ProductService(IGenericRepository<Product> repository)
    {
        _repository = repository;
    }

    public async Task AddAsync(CreateProductDto dto)
    {
        Product productEntity = new Product();
        productEntity.Name = dto.Name;
        productEntity.Price = dto.Price;
        productEntity.IsActive = dto.IsActive;
        productEntity.CategoryId = dto.CategoryId;
        await _repository.AddAsync(productEntity);
    }

    public async Task<List<ProductResponse>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        var dtos = entities.Select(p => new ProductResponse 
        {
            Id = p.Id,
            Name = p.Name,
            Price = p.Price
        }).ToList();
        
        return dtos;
    }
}