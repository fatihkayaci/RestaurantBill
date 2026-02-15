using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Infrastructure.Context;

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
    public async Task AddAsync(T entity)
    {
        _table.Add(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _table.FindAsync(id);
        if (entity != null)
        {
            _table.Remove(entity);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null)
    {
        var query = _table.AsNoTracking();
        if (filter != null)
        {
            query = query.Where(filter);
        }
        return await query.ToListAsync();
    }

    public async Task<T?> GetByIdAsync(int id)
    {
        return await _table.FindAsync(id);
    }

    public async Task UpdateAsync(T entity)
    {
        _table.Update(entity);
        await _context.SaveChangesAsync();
    }
}