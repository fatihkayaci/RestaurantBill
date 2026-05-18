using AutoMapper;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder
{
    public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, OrderDto>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public CreateOrderCommandHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }
        /// <summary>
        /// Creates a new empty order for the given table. Called when a table is opened.
        /// </summary>
        public async Task<OrderDto> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Böyle bir Masa bulunamadı.");

            table.Occupy();

            Order order = Order.Create(request.TableId);

            await _uow.Order.AddAsync(order);
            await _uow.SaveChangesAsync(cancellationToken);

            return _mapper.Map<OrderDto>(order);
        }
    }
}