using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeReservationRepository : FakeGenericRepository<Reservation>, IReservationRepository
{
    public Task<Reservation?> GetActiveReservationByTableId(int tableId, bool trackChanges = false)
        => Task.FromResult(Data.FirstOrDefault(r => r.TableId == tableId && r.Status == ReservationStatus.Active));
}
