using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable
{
    public class CreateTableHandler : IRequestHandler<CreateTableCommand>
    {
        private readonly IUnitOfWork _uow;

        public CreateTableHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        /// <summary>
        /// Creates a new table with the given name.
        /// </summary>
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