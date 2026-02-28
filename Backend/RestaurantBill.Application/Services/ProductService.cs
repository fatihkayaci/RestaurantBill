using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using AutoMapper;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Services;

public class ProductService : IProductService
{
    private readonly IMapper _mapper;
    private readonly IUnitOfWork _uow;
    
    public ProductService(IMapper mapper, IUnitOfWork uow)
    {
        _mapper = mapper;
        _uow = uow;
    }
    public async Task CreateAsync(CreateProductDto dto, CancellationToken cancellationToken)
    {
        var product = _mapper.Map<Product>(dto);
        await _uow.Product.AddAsync(product);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        if (id <= 0) throw new BusinessException("Product ID değeri 0 veya negatif olamaz.");
        var product = await _uow.Product.GetByIdAsync(id);
        Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");
        
        _uow.Product.Delete(product);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<ProductDto>> GetAllAsync()
    {
        var entities = await _uow.Product.GetAllAsync();
        return _mapper.Map<List<ProductDto>>(entities);
    }

    public async Task<ProductDto> GetByIdAsync(int id)
    {
        if(id <= 0) throw new BusinessException("product ID değeri 0 veya negatif olamaz.");
        var product = await _uow.Product.GetByIdAsync(id);
        Guard.AgainstNull(product, "Böyle bir ürün bulunamadı");
        return _mapper.Map<ProductDto>(product);
    }

    public async Task UpdateAsync(UpdateProductDto dto, CancellationToken cancellationToken)
    {
        if (dto == null)
            throw new BusinessException("Güncellenecek veri boş olamaz.");

        if (dto.Id <= 0)
            throw new BusinessException("id 0 dan küçük veya eşit olamaz");

        var product = await _uow.Product.GetByIdAsync(dto.Id, true);
        Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");

        _mapper.Map(dto, product);
        await _uow.SaveChangesAsync(cancellationToken);
    }
    
}