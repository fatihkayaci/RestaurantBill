using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class UserRestaurantRepository : GenericRepository<UserRestaurant>, IUserRestaurantRepository
{
    public UserRestaurantRepository(RestaurantBillDbContext context) : base(context)
    {
    }
}
