using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;
using AutoMapper;

namespace RestaurantBill.Business.Services;

public class CategoryService : ICategoryService
{
    private readonly IGenericRepository<Category> _repository;
    private readonly IMapper _mapper;
    public CategoryService(IGenericRepository<Category> repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }
    public async Task AddAsync(CreateCategoryDto dto)
    {
        var category = _mapper.Map<Category>(dto);
        await _repository.AddAsync(category);
    }

    public async Task<List<ResponseCategoryDto>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return _mapper.Map<List<ResponseCategoryDto>>(entities);
    }
}