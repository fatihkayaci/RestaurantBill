using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Tables.Queries;

public class ReservationQueries(IAppDbContext db)
{
    public Task<Reservation?> GetActiveReservationByTableIdAsync(Guid tableId, bool trackChanges, CancellationToken cancellationToken)
    {
        IQueryable<Reservation> query = db.Reservations;
        if (!trackChanges)
            query = query.AsNoTracking();

        return query
            .OrderByDescending(r => r.Id)
            .FirstOrDefaultAsync(r => r.TableId == tableId && r.Status == ReservationStatus.Active, cancellationToken);
    }
}
