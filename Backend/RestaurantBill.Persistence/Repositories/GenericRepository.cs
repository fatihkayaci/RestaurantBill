using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly RestaurantBillDbContext _context;
    private readonly DbSet<T> _table;

    public GenericRepository(RestaurantBillDbContext context)
    {
        _context = context;
        _table = _context.Set<T>();
    }

    public async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null, bool trackChanges = false, string? includeProperties = null)
    {
        IQueryable<T> query = _table;

        if (!trackChanges) query = query.AsNoTracking();

        if (filter != null) query = query.Where(filter);

        if (!string.IsNullOrWhiteSpace(includeProperties))
        {
            foreach (var includeProperty in includeProperties.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries))
            {
                query = query.Include(includeProperty);
            }
        }

        return await query.ToListAsync();
    }

    public async Task<T?> GetByIdAsync(Guid id, bool trackChanges = false, params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _table;

        if (!trackChanges)
        {
            query = query.AsNoTracking();
        }

        if (includes != null && includes.Length > 0)
        {
            foreach (var include in includes)
            {
                query = query.Include(include);
            }
        }
        return await query.FirstOrDefaultAsync(e => EF.Property<Guid>(e, "Id") == id);
    }
    public async Task AddAsync(T entity)
    {
        await _table.AddAsync(entity);
    }

    public async Task UpdateAsync(T entity)
    {
        _table.Update(entity);
        await Task.CompletedTask;
    }

    public void Delete(T entity)
    {
        _table.Remove(entity);
    }
}