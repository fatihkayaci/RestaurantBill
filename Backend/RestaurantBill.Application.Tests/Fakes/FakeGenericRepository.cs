using System.Linq.Expressions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeGenericRepository<T> : IGenericRepository<T> where T : BaseEntity
{
    protected readonly List<T> Data = [];

    public Task AddAsync(T entity) { Data.Add(entity); return Task.CompletedTask; }
    public Task UpdateAsync(T entity) => Task.CompletedTask;
    public void Delete(T entity) => Data.Remove(entity);

    public Task<T?> GetByIdAsync(Guid id, bool trackChanges = false, params Expression<Func<T, object>>[] includes)
        => Task.FromResult(Data.FirstOrDefault(e => e.Id == id));

    public Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null, bool trackChanges = false, string? includeProperties = null)
        => Task.FromResult(filter != null ? Data.Where(filter.Compile()) : Data.AsEnumerable());

    public Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        int pageNumber,
        int pageSize,
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        bool trackChanges = false,
        string? includeProperties = null)
    {
        IQueryable<T> query = filter != null ? Data.Where(filter.Compile()).AsQueryable() : Data.AsQueryable();
        int totalCount = query.Count();
        if (orderBy != null) query = orderBy(query);
        List<T> items = query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        return Task.FromResult<(IEnumerable<T>, int)>((items, totalCount));
    }

    public IReadOnlyList<T> Added => Data;
}
