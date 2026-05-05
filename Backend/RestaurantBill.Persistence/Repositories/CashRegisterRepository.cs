using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class CashRegisterRepository : GenericRepository<CashRegister>, ICashRegisterRepository
{
    public CashRegisterRepository(RestaurantBillDbContext context) : base(context)
    {
    }
}
