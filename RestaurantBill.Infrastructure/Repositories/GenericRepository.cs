using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Infrastructure.Context;

namespace RestaurantBill.Infrastructure.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    private readonly RestaurantBillDbContext _context;
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

    public Task<T> GetByIdAsync(int id)
    {
        throw new NotImplementedException();
    }

    public void Update(T entity)
    {
        throw new NotImplementedException();
    }
}