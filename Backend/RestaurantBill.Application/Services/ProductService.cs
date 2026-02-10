using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain;
using AutoMapper;

namespace RestaurantBill.Business.Services;

public class ProductService : IProductService
{
    private readonly IGenericRepository<Product> _repository;
    private readonly IMapper _mapper;
    public ProductService(IGenericRepository<Product> repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task AddAsync(CreateProductDto dto)
    {
        var product = _mapper.Map<Product>(dto);
        // product.IsActive = true;
        await _repository.AddAsync(product);
    }

    public async Task<List<ProductResponse>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return _mapper.Map<List<ProductResponse>>(entities);
    }
}