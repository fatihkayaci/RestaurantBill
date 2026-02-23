using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Services;

public class UserService : IUserService
{
    public Task CreateAsync(CreateUserDto dto)
    {
        throw new NotImplementedException();
    }

    public Task DeleteAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task<List<UserDto>> GetAllAsync()
    {
        throw new NotImplementedException();
    }

    public Task<UserDto> GetByIdAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task UpdateAsync(UpdateUserDto dto)
    {
        throw new NotImplementedException();
    }

    #region old code
    /*
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
    */
    #endregion

}