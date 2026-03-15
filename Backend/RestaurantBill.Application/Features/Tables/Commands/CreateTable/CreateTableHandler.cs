using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable
{
    public class CreateTableHandler : IRequestHandler<CreateTableCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMessageProducer _messageProducer;

        public CreateTableHandler(IUnitOfWork uow, IMessageProducer messageProducer)
        {
            _uow = uow;
            _messageProducer = messageProducer;
        }

        public async Task Handle(CreateTableCommand request, CancellationToken cancellationToken)
        {
            var table = new Table
            {
                Name = request.Name
            };
            await _uow.Table.AddAsync(table);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}