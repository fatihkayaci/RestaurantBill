using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Domain.Interfaces;

public interface IReservationRepository : IGenericRepository<Reservation>
{
    Task<Reservation?> GetActiveReservationByTableId(Guid tableId, bool trackChanges = false);
}
