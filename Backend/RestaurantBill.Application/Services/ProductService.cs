using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Services;

public class ProductService : IProductService
{
    

    public Task CreateAsync(CreateProductDto dto)
    {
        throw new NotImplementedException();
    }

    public Task DeleteAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task<List<ProductDto>> GetAllAsync()
    {
        throw new NotImplementedException();
    }

    public Task<ProductDto> GetByIdAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task UpdateAsync(UpdateProductDto dto)
    {
        throw new NotImplementedException();
    }
    #region old code
    /*private readonly IGenericRepository<Product> _repository;
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
     }*/
    #endregion

}