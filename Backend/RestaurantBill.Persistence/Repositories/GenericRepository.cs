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

    public async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null, bool trackChanges = false)
    {
        IQueryable<T> query = _table;

        if (!trackChanges)
            query = query.AsNoTracking();

        if (filter != null)
            query = query.Where(filter);

        return await query.ToListAsync();
    }

    public async Task<T?> GetByIdAsync(int id, bool trackChanges = false)
    {
        if (!trackChanges)
            return await _table.AsNoTracking()
                               .FirstOrDefaultAsync(e => EF.Property<int>(e, "Id") == id);

        return await _table.FindAsync(id);
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

    public async Task DeleteAsync(int id)
    {
        var entity = await _table.FindAsync(id);
        if (entity != null)
        {
            _table.Remove(entity);
        }
    }
}