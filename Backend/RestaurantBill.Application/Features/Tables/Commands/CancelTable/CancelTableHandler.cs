using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Features.Tables.Commands.CancelTable;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservation
{
    public class CancelTableHandler : IRequestHandler<CancelTableCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMessageProducer _messageProducer;

        public CancelTableHandler(IUnitOfWork uow, IMessageProducer messageProducer)
        {
            _uow = uow;
            _messageProducer = messageProducer;
        }

        public async Task Handle(CancelTableCommand request, CancellationToken cancellationToken)
        {
            
        }
    }
}