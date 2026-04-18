using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Queries.GetAll
{
    public class GetAllTableQuery : IRequest<List<TableDto>>, ICacheable
    {
        public string CacheKey => "tables:all";

        public TimeSpan Ttl => TimeSpan.FromSeconds(30);
    }
}