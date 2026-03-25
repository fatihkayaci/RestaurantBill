using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId
{
    public class GetActiveOrderByTableIdHandler : IRequestHandler<GetActiveOrderByTableIdQuery, OrderDto>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public GetActiveOrderByTableIdHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }
        /// <summary>
        /// Returns the active order for the given table, including its items and product details.
        /// </summary>
        public async Task<OrderDto> Handle(GetActiveOrderByTableIdQuery request, CancellationToken cancellationToken)
        {
            var order = await _uow.Order.GetActiveOrderByTableId(request.TableId, false);
            var orderDto = _mapper.Map<OrderDto>(order);
            return orderDto;
        }
    }
}