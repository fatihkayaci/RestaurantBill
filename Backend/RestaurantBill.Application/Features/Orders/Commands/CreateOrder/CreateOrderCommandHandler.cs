using AutoMapper;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
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
            if (request.TableId <= 0)
                throw new BusinessException("Geçerli bir masa numarası girmelisiniz.");

            var table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Masa bulunamadı.");

            if (table.Status != TableStatus.Available)
                throw new BusinessException("Seçilen masa şu an hizmet veremez durumda.");
            
            var order = new Order { TableId = request.TableId, Status = OrderStatus.Active };
            
            table.Status = TableStatus.Occupied;

            await _uow.Order.AddAsync(order);
            await _uow.SaveChangesAsync(cancellationToken);

            return _mapper.Map<OrderDto>(order);
        }
    }
}