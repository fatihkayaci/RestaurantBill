using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface ITableService
{
    Task CreateAsync(CreateTableDto dto, CancellationToken cancellationToken); 
    Task<List<TableDto>> GetAllAsync();
    Task UpdateAsync(UpdateTableDto dto, CancellationToken cancellationToken);
    Task<TableDto> GetByIdAsync(int id);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
    Task ChangeTableStatus(int tableId, ChangeTableStatusDto statusDto, CancellationToken cancellationToken);
}