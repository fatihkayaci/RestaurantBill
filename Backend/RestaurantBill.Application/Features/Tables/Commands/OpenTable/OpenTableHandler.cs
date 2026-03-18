using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableHandler : IRequestHandler<OpenTableCommand, int>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMessageProducer _messageProducer;

        public OpenTableHandler(IUnitOfWork uow, IMessageProducer messageProducer)
        {
            _uow = uow;
            _messageProducer = messageProducer;
        }

        public async Task<int> Handle(OpenTableCommand request, CancellationToken cancellationToken)
        {
            if (request.TableId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");

            var table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");
            
            if (table.Status == TableStatus.Occupied)
                throw new BusinessException("Bu masa zaten dolu!");

            table.Status = TableStatus.Occupied;
            
            var order = new Order
            {
                TableId = request.TableId,
            };
            
            await _uow.Order.AddAsync(order);
            await _uow.SaveChangesAsync(cancellationToken);
            
            return order.Id; 
        }
    }
}