using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Regions.Commands.CreateRegion
{
    public class CreateRegionCommandHandler : IRequestHandler<CreateRegionCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _userService;

        public CreateRegionCommandHandler(IUnitOfWork uow, ICurrentUserService userService)
        {
            _uow = uow;
            _userService = userService;
        }

        public async Task Handle(CreateRegionCommand command, CancellationToken cancellationToken)
        {
            int restaurantId = _userService.RestaurantId;

            Region region = Region.Create(command.Name, restaurantId);
            await _uow.Region.AddAsync(region);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
