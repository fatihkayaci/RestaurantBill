using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class ShiftRepository : GenericRepository<Shift>, IShiftRepository
{
    public ShiftRepository(RestaurantBillDbContext context) : base(context)
    {
    }
}
