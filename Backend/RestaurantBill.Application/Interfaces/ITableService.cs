using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface ITableService
{
    Task CreateAsync(CreateTableDto dto); 
    Task<List<TableDto>> GetAllAsync();
    Task UpdateAsync(UpdateTableDto dto);
    Task<TableDto> GetByIdAsync(int id);
    Task DeleteAsync(int id);
}