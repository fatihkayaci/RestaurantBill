using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.CloseTable
{
    public class CloseTableHandler : IRequestHandler<CloseTableCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMessageProducer _messageProducer;

        public CloseTableHandler(IUnitOfWork uow, IMessageProducer messageProducer)
        {
            _uow = uow;
            _messageProducer = messageProducer;
        }

        public async Task Handle(CloseTableCommand request, CancellationToken cancellationToken)
        {
            
        }
    }
}