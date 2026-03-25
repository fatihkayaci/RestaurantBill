using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Services;

public class UserService : IUserService
{
    private readonly IMapper _mapper;
    private readonly IUnitOfWork _uow;
    
    public UserService(IMapper mapper, IUnitOfWork uow)
    {
        _mapper = mapper;
        _uow = uow;
    }
    public async Task CreateAsync(CreateUserDto dto, CancellationToken cancellationToken)
    {
        var user = _mapper.Map<User>(dto);
        await _uow.User.AddAsync(user);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        if (id <= 0) throw new BusinessException("Kullanıcı ID değeri 0 veya negatif olamaz.");
        var user = await _uow.User.GetByIdAsync(id);
        Guard.AgainstNull(user, "Böyle bir kullanıcı bulunamadı.");
        _uow.User.Delete(user);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        var entities = await _uow.User.GetAllAsync();
        return _mapper.Map<List<UserDto>>(entities);
    }

    public async Task<UserDto> GetByIdAsync(int id)
    {
        if(id <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
        var user = await _uow.User.GetByIdAsync(id);
        Guard.AgainstNull(user, "Böyle bir kullanıcı bulunamadı");
        return _mapper.Map<UserDto>(user);
    }

    public async Task UpdateAsync(UpdateUserDto dto, CancellationToken cancellationToken)
    {
        if (dto == null)
            throw new BusinessException("Güncellenecek veri boş olamaz.");

        if (dto.Id <= 0)
            throw new BusinessException("id 0 dan küçük veya eşit olamaz");

        var user = await _uow.User.GetByIdAsync(dto.Id, true);
        Guard.AgainstNull(user, "Böyle bir kullanıcı bulunamadı.");

        _mapper.Map(dto, user);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}