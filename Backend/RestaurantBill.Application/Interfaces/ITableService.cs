using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface ITableService
{
    Task CreateAsync(CreateTableDto dto); 
    Task<List<TableDto>> GetAllAsync();
}