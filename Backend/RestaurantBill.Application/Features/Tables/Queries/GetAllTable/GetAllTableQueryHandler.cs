using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Common;
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

            // Bölge atanmış garson ve mutfak yalnızca kendi bölgelerinin masalarını görür.
            StaffAccess access = await _db.GetStaffAccessAsync(_currentUser, cancellationToken);

            List<TableDto> tables = await _db.Tables
                .AsNoTracking()
                .Where(t => t.Region.BranchId == restaurantId)
                .InStaffRegions(access)
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
                .Select(o => new { o.Id, o.TableId, o.TotalPrice, o.PaidOnAccount, o.CreatedAt, o.CreatedUser, o.BillRequestedAt })
                .ToListAsync(cancellationToken);

            var totalsByTableId = activeOrders.ToDictionary(o => o.TableId, o => o.TotalPrice);
            var paidByTableId = activeOrders.ToDictionary(o => o.TableId, o => o.PaidOnAccount);
            var occupiedSinceByTableId = activeOrders.ToDictionary(o => o.TableId, o => o.CreatedAt);

            List<Guid> creatorIds = activeOrders.Select(o => o.CreatedUser).Distinct().ToList();
            Dictionary<Guid, string> creatorNameById = await _db.Users
                .AsNoTracking()
                .Where(u => creatorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);
            var creatorNameByTableId = activeOrders.ToDictionary(o => o.TableId, o => creatorNameById.GetValueOrDefault(o.CreatedUser, string.Empty));

            var billRequestedByTableId = activeOrders.ToDictionary(o => o.TableId, o => o.BillRequestedAt);

            // Garson kartındaki "Gecikme" rozeti: süresi dolmuş, mutfakta bekleyen/hazırlanan kalemler.
            List<Guid> activeOrderIds = activeOrders.Select(o => o.Id).ToList();
            var timedItems = await _db.OrderItems
                .AsNoTracking()
                .Where(i => activeOrderIds.Contains(i.OrderId) && i.PrepMinutes != null
                    && (i.Status == OrderItemStatus.Pending || i.Status == OrderItemStatus.Preparing))
                .Select(i => new { i.Order.TableId, i.CreatedAt, i.PrepMinutes })
                .ToListAsync(cancellationToken);
            DateTime utcNow = DateTime.UtcNow;
            Dictionary<Guid, int> overdueByTableId = timedItems
                .Where(i => utcNow >= i.CreatedAt.AddMinutes(i.PrepMinutes!.Value))
                .GroupBy(i => i.TableId)
                .ToDictionary(g => g.Key, g => g.Count());

            foreach (TableDto table in tables)
            {
                table.BillRequestedAt = billRequestedByTableId.GetValueOrDefault(table.Id);
                table.OverdueItemCount = overdueByTableId.GetValueOrDefault(table.Id);
                table.ActiveOrderTotal = totalsByTableId.GetValueOrDefault(table.Id);
                table.PaidAmount = paidByTableId.GetValueOrDefault(table.Id);
                table.RemainingAmount = table.ActiveOrderTotal - table.PaidAmount;
                table.OccupiedSince = occupiedSinceByTableId.TryGetValue(table.Id, out var createdAt) ? createdAt : null;
                table.CreatedByUserName = creatorNameByTableId.GetValueOrDefault(table.Id, string.Empty);
            }

            return Result<List<TableDto>>.Success(tables);
        }
    }
}
