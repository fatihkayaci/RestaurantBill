using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class VerificationCodeRepository : GenericRepository<VerificationCode>, IVerificationCodeRepository
{
    public VerificationCodeRepository(RestaurantBillDbContext context) : base(context)
    {
    }
}
