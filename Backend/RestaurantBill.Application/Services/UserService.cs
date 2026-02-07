using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;
using AutoMapper;

namespace RestaurantBill.Business.Services;

public class UserService : IUserService
{
    private readonly IGenericRepository<User> _repository;
    private readonly IMapper _mapper;
    public UserService(IGenericRepository<User> repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }
    public async Task AddAsync(CreateUserDto dto)
    {
        var user = _mapper.Map<User>(dto);
        await _repository.AddAsync(user);
    }

    public async Task<List<UserResponse>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return _mapper.Map<List<UserResponse>>(entities);
    }
}