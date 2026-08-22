using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.CreateRegion
{
    public class CreateRegionCommandHandler : IRequestHandler<CreateRegionCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _userService;

        public CreateRegionCommandHandler(IAppDbContext db, ICurrentUserService userService)
        {
            _db = db;
            _userService = userService;
        }

        public async Task<Result> Handle(CreateRegionCommand command, CancellationToken cancellationToken)
        {
            Guid restaurantId = _userService.BranchId;

            bool nameExists = await _db.Regions
                .AnyAsync(r => r.Name == command.Name && r.BranchId == restaurantId, cancellationToken);
            if (nameExists)
                return Result.Failure("Bu isimde bir bölge zaten mevcut.");

            Region region = Region.Create(command.Name, restaurantId);
            _db.Regions.Add(region);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _userService.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                restaurantId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "RegionCreated",
                $"{actor?.FullName} {region.Name} adında yeni bir bölge ekledi.",
                nameof(Region),
                region.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
