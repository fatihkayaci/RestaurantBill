using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId
{
    public class GetActiveOrderByTableIdHandler : IRequestHandler<GetActiveOrderByTableIdQuery, Result<OrderDto?>>
    {
        private readonly OrderQueries _orderQueries;

        public GetActiveOrderByTableIdHandler(OrderQueries orderQueries)
        {
            _orderQueries = orderQueries;
        }

        public async Task<Result<OrderDto?>> Handle(GetActiveOrderByTableIdQuery request, CancellationToken cancellationToken)
        {
            var order = await _orderQueries.GetActiveOrderByTableIdAsync(request.TableId, trackChanges: false, cancellationToken);
            return Result<OrderDto?>.Success(order?.ToDto());
        }
    }
}
