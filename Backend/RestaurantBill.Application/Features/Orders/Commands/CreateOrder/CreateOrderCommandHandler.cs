using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder
{
    public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, Result<OrderDto>>
    {
        private readonly IUnitOfWork _uow;

        public CreateOrderCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        /// <summary>
        /// Creates a new empty order for the given table. Called when a table is opened.
        /// </summary>
        public async Task<Result<OrderDto>> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.TableId, true);
            if (table is null)
                return Result<OrderDto>.Failure("Böyle bir Masa bulunamadı.");

            table.Occupy();

            Order order = Order.Create(request.TableId);

            await _uow.Order.AddAsync(order);
            await _uow.SaveChangesAsync(cancellationToken);

            return Result<OrderDto>.Success(order.ToDto());
        }
    }
}