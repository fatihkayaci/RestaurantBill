using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
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
            Guid restaurantId = _userService.BranchId;

            bool nameExists = (await _uow.Region.GetAllAsync(r => r.Name == command.Name && r.BranchId == restaurantId, false)).Any();
            if (nameExists)
                return Result.Failure("Bu isimde bir bölge zaten mevcut.");

            Region region = Region.Create(command.Name, restaurantId);
            await _uow.Region.AddAsync(region);

            User? actor = await _uow.User.GetByIdAsync(_userService.UserId);
            AuditLog log = AuditLog.Create(
                restaurantId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "RegionCreated",
                $"{actor?.FullName} {region.Name} adında yeni bir bölge ekledi.",
                nameof(Region),
                region.Id);
            await _uow.AuditLog.AddAsync(log);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
