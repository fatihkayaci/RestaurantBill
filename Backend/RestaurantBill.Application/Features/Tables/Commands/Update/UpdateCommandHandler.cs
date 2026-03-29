using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Features.Tables.Commands.Update
{
    public class UpdateCommandHandler : IRequestHandler<UpdateCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMessageProducer _messageProducer;

        public UpdateCommandHandler(IUnitOfWork uow, IMessageProducer messageProducer)
        {
            _uow = uow;
            _messageProducer = messageProducer;
        }

        /// <summary>
        /// Creates a new table with the given name.
        /// </summary>
        public async Task Handle(UpdateCommand request, CancellationToken cancellationToken)
        {
            var table = await _uow.Table.GetByIdAsync(request.Id, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı");
            table.Name = request.Name;
            await _uow.Table.UpdateAsync(table);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}