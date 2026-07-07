using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable
{
    public class CreateTableCommandHandler : IRequestHandler<CreateTableCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public CreateTableCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task Handle(CreateTableCommand request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            Table table = Table.Create(request.Name, string.Empty, restaurantId);
            table.AssignRegion(request.RegionId);
            await _uow.Table.AddAsync(table);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
