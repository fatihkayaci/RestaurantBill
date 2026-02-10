using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface ITableService
{
    Task AddAsync(CreateTableDto dto); 
    Task<List<TableResponse>> GetAllAsync();
}