using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Core.DTOs;
using AutoMapper;

namespace RestaurantBill.Business.Services;

public class TableService : ITableService
{
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
}