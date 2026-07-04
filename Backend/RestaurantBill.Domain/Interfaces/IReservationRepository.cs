using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Domain.Interfaces;

public interface IReservationRepository : IGenericRepository<Reservation>
{
    Task<Reservation?> GetActiveReservationByTableId(int tableId, bool trackChanges = false);
}
