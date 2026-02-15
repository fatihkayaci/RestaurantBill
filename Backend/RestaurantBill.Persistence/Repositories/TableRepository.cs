using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Infrastructure.Context;

namespace RestaurantBill.Persistence.Repositories
{
    public class TableRepository : GenericRepository<Table>, ITableRepository
    {
        public TableRepository(RestaurantBillDbContext context) : base(context)
        {
        }
    }
}