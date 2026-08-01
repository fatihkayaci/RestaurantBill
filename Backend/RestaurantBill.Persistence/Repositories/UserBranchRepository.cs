using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class UserBranchRepository : GenericRepository<UserBranch>, IUserBranchRepository
{
    public UserBranchRepository(RestaurantBillDbContext context) : base(context)
    {
    }
}
