using RestaurantBill.Core.DTOs;
namespace RestaurantBill.Core.Interfaces;

public interface ITableService
{
    Task AddAsync(CreateTableDto dto); 
    Task<List<TableResponse>> GetAllAsync();
}