using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable
{
    public class ReservationTableHandler : IRequestHandler<ReservationTableCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMessageProducer _messageProducer;

        public ReservationTableHandler(IUnitOfWork uow, IMessageProducer messageProducer)
        {
            _uow = uow;
            _messageProducer = messageProducer;
        }

        public async Task Handle(ReservationTableCommand request, CancellationToken cancellationToken)
        {
            
            if (request.TableId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");

            var table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");
            
            table.Status = TableStatus.Reserved;
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}