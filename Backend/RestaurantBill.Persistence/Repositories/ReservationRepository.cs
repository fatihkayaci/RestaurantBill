using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class ReservationRepository : GenericRepository<Reservation>, IReservationRepository
{
    public ReservationRepository(RestaurantBillDbContext context) : base(context)
    {
    }

    public async Task<Reservation?> GetActiveReservationByTableId(Guid tableId, bool trackChanges = false)
    {
        IQueryable<Reservation> query = _context.Set<Reservation>();

        if (!trackChanges)
            query = query.AsNoTracking();

        return await query
            .OrderByDescending(r => r.Id)
            .FirstOrDefaultAsync(r => r.TableId == tableId && r.Status == ReservationStatus.Active);
    }
}
