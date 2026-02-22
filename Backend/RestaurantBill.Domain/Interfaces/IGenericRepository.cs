namespace RestaurantBill.Domain.Interfaces;

using System.Linq.Expressions;

public interface IGenericRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id, bool trackChanges = false);
    Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null, bool trackChanges = false);
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(int id);
}