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
        => Task.FromResult(Data.AsEnumerable());

    public IReadOnlyList<T> Added => Data;
}
