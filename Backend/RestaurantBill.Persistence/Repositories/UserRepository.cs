using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Infrastructure.Context;

namespace RestaurantBill.Persistence.Repositories
{
    public class UserRepository : GenericRepository<User>, IUserRepository
    {
        public UserRepository(RestaurantBillDbContext context) : base(context)
        {
        }
    }
}