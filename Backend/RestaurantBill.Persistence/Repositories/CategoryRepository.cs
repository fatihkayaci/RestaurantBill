using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Infrastructure.Context;

namespace RestaurantBill.Persistence.Repositories;

public class CategoryRepository : GenericRepository<Category>, ICategoryRepository
{
    public CategoryRepository(RestaurantBillDbContext context) : base(context)
    {
    }
}