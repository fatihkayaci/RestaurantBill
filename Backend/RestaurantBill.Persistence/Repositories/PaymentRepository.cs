using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class PaymentRepository : GenericRepository<Payment>, IPaymentRepository
{
    public PaymentRepository(RestaurantBillDbContext context) : base(context)
    {
    }
}
