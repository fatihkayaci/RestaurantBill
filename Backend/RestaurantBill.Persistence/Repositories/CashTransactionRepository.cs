using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class CashTransactionRepository : GenericRepository<CashTransaction>, ICashTransactionRepository
{
    public CashTransactionRepository(RestaurantBillDbContext context) : base(context)
    {
    }
}
