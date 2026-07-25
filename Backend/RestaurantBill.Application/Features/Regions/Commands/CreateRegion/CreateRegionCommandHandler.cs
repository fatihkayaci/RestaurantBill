using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.CreateRegion
{
    public class CreateRegionCommandHandler : IRequestHandler<CreateRegionCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _userService;

        public CreateRegionCommandHandler(IUnitOfWork uow, ICurrentUserService userService)
        {
            _uow = uow;
            _userService = userService;
        }

        public async Task<Result> Handle(CreateRegionCommand command, CancellationToken cancellationToken)
        {
            int restaurantId = _userService.RestaurantId;

            bool nameExists = (await _uow.Region.GetAllAsync(r => r.Name == command.Name && r.RestaurantId == restaurantId, false)).Any();
            if (nameExists)
                return Result.Failure("Bu isimde bir bölge zaten mevcut.");

            Region region = Region.Create(command.Name, restaurantId);
            await _uow.Region.AddAsync(region);
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
