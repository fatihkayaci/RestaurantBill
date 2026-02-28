using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Services;

public class RestaurantService : IRestaurantService
{

    private readonly IMapper _mapper;
    private readonly IUnitOfWork _uow;
    
    public RestaurantService(IMapper mapper, IUnitOfWork uow)
    {
        _mapper = mapper;
        _uow = uow;
    }
    public async Task CreateAsync(CreateRestaurantDto dto, CancellationToken cancellationToken)
    {
        var restaurant = _mapper.Map<Restaurant>(dto);
        await _uow.Restaurant.AddAsync(restaurant);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        if (id <= 0) throw new BusinessException("Restaurant ID değeri 0 veya negatif olamaz.");
        var restaurant = await _uow.Restaurant.GetByIdAsync(id);
        Guard.AgainstNull(restaurant, "Böyle bir restaurant bulunamadı.");
        _uow.Restaurant.Delete(restaurant);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<RestaurantDto>> GetAllAsync()
    {
        var entities = await _uow.Restaurant.GetAllAsync();
        return _mapper.Map<List<RestaurantDto>>(entities);
    }

    public async Task<RestaurantDto> GetByIdAsync(int id)
    {
        if(id <= 0) throw new BusinessException("Restaurant ID değeri 0 veya negatif olamaz.");
        var restaurant = await _uow.Restaurant.GetByIdAsync(id);
        Guard.AgainstNull(restaurant, "Böyle bir restaurant bulunamadı");
        return _mapper.Map<RestaurantDto>(restaurant);
    }

    public async Task UpdateAsync(UpdateRestaurantDto dto, CancellationToken cancellationToken)
    {
        if (dto == null)
            throw new BusinessException("Güncellenecek veri boş olamaz.");

        if (dto.Id <= 0)
            throw new BusinessException("id 0 dan küçük veya eşit olamaz");

        var restaurant = await _uow.Restaurant.GetByIdAsync(dto.Id, true);
        Guard.AgainstNull(restaurant, "Böyle bir restaurant bulunamadı.");

        _mapper.Map(dto, restaurant);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}