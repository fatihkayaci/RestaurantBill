namespace RestaurantBill.Domain.Interfaces;

using System.Linq.Expressions;

public interface IGenericRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, bool trackChanges = false, params Expression<Func<T, object>>[] includes);
    Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null, bool trackChanges = false, string? includeProperties = null);
    Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        int pageNumber,
        int pageSize,
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        bool trackChanges = false,
        string? includeProperties = null);
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    void Delete(T entity);
}