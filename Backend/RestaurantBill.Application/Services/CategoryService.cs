using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Interfaces;
using AutoMapper;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly IMapper _mapper;
    private readonly IUnitOfWork _uow;
    public CategoryService(IMapper mapper, IUnitOfWork uow)
    {
        _mapper = mapper;
        _uow = uow;
    }

    /// <summary>
    /// Maps the provided DTO to a category entity and saves it to the database.
    /// </summary>
    /// <param name="dto">The data transfer object containing category details.</param>
    public async Task CreateAsync(CreateCategoryDto dto, CancellationToken cancellationToken)
    {
        var category = _mapper.Map<Category>(dto);
        await _uow.Category.AddAsync(category);
        await _uow.SaveChangesAsync(cancellationToken);
    }
    
    /// <summary>
    /// Deletes a category by its ID.
    /// Throws BusinessException if the ID is invalid.
    /// Throws NotFoundException if the category does not exist in the database.
    /// </summary>    
    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        if (id <= 0) throw new BusinessException("Kategori ID değeri 0 veya negatif olamaz.");
        var category = await _uow.Category.GetByIdAsync(id);
        Guard.AgainstNull(category, "Böyle bir kategori bulunamadı");
        
        _uow.Category.Delete(category);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Retrieves all categories from the database and maps them to DTOs.
    /// </summary>
    /// <returns>A list of category data transfer objects.</returns>
    public async Task<List<CategoryDto>> GetAllAsync()
    {
        var entities = await _uow.Category.GetAllAsync();
        return _mapper.Map<List<CategoryDto>>(entities);
    }

    /// <summary>
    /// Retrieves a category by its ID.
    /// Throws BusinessException if ID is invalid.
    /// Throws NotFoundException if category does not exist.
    /// </summary>
    public async Task<CategoryDto> GetByIdAsync(int id)
    {
        if(id <= 0) throw new BusinessException("Kategori ID değeri 0 veya negatif olamaz.");
        var category = await _uow.Category.GetByIdAsync(id);
        Guard.AgainstNull(category, "Böyle bir kategori bulunamadı");
        return _mapper.Map<CategoryDto>(category);
    }

    /// <summary>
    /// Updates an existing category with the provided DTO data.
    /// Throws BusinessException if the DTO is null or the ID is invalid.
    /// Throws NotFoundException if the category does not exist in the database.
    /// </summary>
    public async Task UpdateAsync(UpdateCategoryDto dto, CancellationToken cancellationToken)
    {
        if (dto == null)
            throw new BusinessException("Güncellenecek veri boş olamaz.");

        if (dto.Id <= 0)
            throw new BusinessException("Güncellenecek ID 0 veya negatif olamaz.");
            
        var category = await _uow.Category.GetByIdAsync(dto.Id, true);
        Guard.AgainstNull(category, "Böyle bir kategori bulunamadı");

        _mapper.Map(dto, category); 

        await _uow.Category.UpdateAsync(category);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}