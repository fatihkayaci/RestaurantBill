using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Queries.GetAllTable
{
    public class GetAllTableQueryHandler : IRequestHandler<GetAllTableQuery, Result<List<TableDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetAllTableQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<List<TableDto>>> Handle(GetAllTableQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty) return Result<List<TableDto>>.Failure("Geçersiz şube bilgisi.");

            List<TableDto> tables = await _db.Tables
                .AsNoTracking()
                .Where(t => t.Region.BranchId == restaurantId)
                .OrderBy(t => t.Name)
                .Select(t => new TableDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Note = t.Note,
                    Status = t.Status,
                    RegionId = t.RegionId,
                    RegionName = t.Region.Name
                })
                .ToListAsync(cancellationToken);

            List<Guid> tableIds = tables.Select(t => t.Id).ToList();
            var activeOrders = await _db.Orders
                .AsNoTracking()
                .Where(o => tableIds.Contains(o.TableId) && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
                .Select(o => new { o.TableId, o.TotalPrice, o.CreatedAt, o.CreatedUser })
                .ToListAsync(cancellationToken);

            var totalsByTableId = activeOrders.ToDictionary(o => o.TableId, o => o.TotalPrice);
            var occupiedSinceByTableId = activeOrders.ToDictionary(o => o.TableId, o => o.CreatedAt);

            List<Guid> creatorIds = activeOrders.Select(o => o.CreatedUser).Distinct().ToList();
            Dictionary<Guid, string> creatorNameById = await _db.Users
                .AsNoTracking()
                .Where(u => creatorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);
            var creatorNameByTableId = activeOrders.ToDictionary(o => o.TableId, o => creatorNameById.GetValueOrDefault(o.CreatedUser, string.Empty));

            foreach (TableDto table in tables)
            {
                table.ActiveOrderTotal = totalsByTableId.GetValueOrDefault(table.Id);
                table.OccupiedSince = occupiedSinceByTableId.TryGetValue(table.Id, out var createdAt) ? createdAt : null;
                table.CreatedByUserName = creatorNameByTableId.GetValueOrDefault(table.Id, string.Empty);
            }

            return Result<List<TableDto>>.Success(tables);
        }
    }
}
