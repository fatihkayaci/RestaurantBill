using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Services;

public class TableService : ITableService
{
    public Task CreateAsync(CreateTableDto dto)
    {
        throw new NotImplementedException();
    }

    public Task DeleteAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task<List<TableDto>> GetAllAsync()
    {
        throw new NotImplementedException();
    }

    public Task<TableDto> GetByIdAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task UpdateAsync(UpdateTableDto dto)
    {
        throw new NotImplementedException();
    }
    #region old code
    /*
        private readonly IGenericRepository<Table> _repository;
        private readonly IMapper _mapper;
        public TableService(IGenericRepository<Table> repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }
        public async Task AddAsync(CreateTableDto dto)
        {
            var table = _mapper.Map<Table>(dto);
            await _repository.AddAsync(table);
        }

        public async Task<List<TableResponse>> GetAllAsync()
        {
            var entities = await _repository.GetAllAsync();
            return _mapper.Map<List<TableResponse>>(entities);
        }

    */
    #endregion


}