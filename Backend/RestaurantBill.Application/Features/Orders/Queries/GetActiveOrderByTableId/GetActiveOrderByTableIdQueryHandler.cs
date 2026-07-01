using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;

namespace RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId
{
    public class GetActiveOrderByTableIdHandler : IRequestHandler<GetActiveOrderByTableIdQuery, OrderDto>
    {
        private readonly IUnitOfWork _uow;

        public GetActiveOrderByTableIdHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        /// <summary>
        /// Returns the active order for the given table, including its items and product details.
        /// </summary>
        public async Task<OrderDto> Handle(GetActiveOrderByTableIdQuery request, CancellationToken cancellationToken)
        {
            var order = await _uow.Order.GetActiveOrderByTableId(request.TableId, false);
            return order!.ToDto();
        }
    }
}