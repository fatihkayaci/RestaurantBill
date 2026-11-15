using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Queries.GetAllProductWithCost
{
    // Cache'lenmez: yalnızca menü yönetim ekranı çağırır, kaydettikten hemen sonra güncel liste görünmeli.
    public class GetAllProductWithCostQuery : IRequest<Result<List<ProductWithCostDto>>>
    {
    }
}
