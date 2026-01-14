using System.Linq;
using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;

namespace RestaurantBill.Business.Services;

public class CategoryService : ICategoryService
{
    private readonly IGenericRepository<Category> _repository;
    public CategoryService(IGenericRepository<Category> repository)
    {
        _repository = repository;
    }
    public Task AddAsync(CreateCategoryDto dto)
    {
        throw new NotImplementedException();
    }
    Task<List<ResponseCategoryDto>> ICategoryService.GetAllAsync()
    {
        throw new NotImplementedException();
    }
}