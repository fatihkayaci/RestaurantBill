using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToCashierQuery
{
    public class GetAllOrdersToCashierQueryHandler : IRequestHandler<GetAllOrdersToCashierQuery, Result<List<OrderDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetAllOrdersToCashierQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<List<OrderDto>>> Handle(GetAllOrdersToCashierQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty)
                return Result<List<OrderDto>>.Failure("Geçersiz şube bilgisi.");

            // Bölge/masa atanmış kasiyer yalnızca kapsamındaki masaların hesaplarını görür; paket siparişler her zaman listede.
            StaffAccess access = await _db.GetStaffAccessAsync(_currentUser, cancellationToken);

            List<Order> orders = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Table)
                .Include(o => o.OrderItems).ThenInclude(i => i.Product).ThenInclude(p => p!.Category).ThenInclude(c => c!.Branch)
                .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu).ThenInclude(s => s!.Category)
                .Where(o => o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled && o.BranchId == restaurantId)
                .InStaffRegions(access)
                .ToListAsync(cancellationToken);

            List<Guid> creatorIds = orders.Select(o => o.CreatedUser).Distinct().ToList();
            Dictionary<Guid, string> creatorNameById = await _db.Users
                .AsNoTracking()
                .Where(u => creatorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);
            // Paket siparişin bileti "PAKET #123 · Moda" olarak görünür.
            Dictionary<Guid, DeliveryScope.DeliveryLabel> deliveryLabels = await _db.LoadDeliveryLabelsAsync(orders, cancellationToken);

            return Result<List<OrderDto>>.Success(orders.Select(o =>
            {
                var dto = o.ToDto();
                dto.CreatedByUserName = creatorNameById.GetValueOrDefault(o.CreatedUser, string.Empty);
                dto.ApplyDeliveryLabel(deliveryLabels);
                return dto;
            }).ToList());
        }
    }
}
