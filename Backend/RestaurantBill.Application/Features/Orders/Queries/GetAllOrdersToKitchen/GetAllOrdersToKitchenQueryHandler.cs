using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen
{
    public class GetAllOrdersToKitchenQueryHandler : IRequestHandler<GetAllOrdersToKitchenQuery, Result<List<OrderDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetAllOrdersToKitchenQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<List<OrderDto>>> Handle(GetAllOrdersToKitchenQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty)
                return Result<List<OrderDto>>.Failure("Geçersiz şube bilgisi.");

            var excludedStatuses = new[] { OrderStatus.Paid, OrderStatus.Cancelled };
            // Kategori atanmış mutfak ("Izgara") yalnızca o kategorilerdeki ürünleri içeren siparişleri, sipariş içinde
            // de yalnızca o ürünleri görür; aynı masanın tatlıları tatlı istasyonuna düşer.
            StaffAccess access = await _db.GetStaffAccessAsync(_currentUser, cancellationToken);
            HashSet<Guid>? categoryIds = access.CategoryIds?.ToHashSet();

            IQueryable<Order> query = _db.Orders
                .AsNoTracking()
                .Include(o => o.Table)
                .Include(o => o.OrderItems).ThenInclude(i => i.Product).ThenInclude(p => p!.Category)
                .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu)
                .Where(o => !excludedStatuses.Contains(o.Status) && o.BranchId == restaurantId);
            if (categoryIds is not null)
            {
                List<Guid> ids = categoryIds.ToList();
                query = query.Where(o => o.OrderItems.Any(i => i.Product != null && ids.Contains(i.Product.CategoryId)));
            }
            List<Order> orders = await query.ToListAsync(cancellationToken);

            List<Guid> creatorIds = orders.Select(o => o.CreatedUser).Distinct().ToList();
            Dictionary<Guid, string> creatorNameById = await _db.Users
                .AsNoTracking()
                .Where(u => creatorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);
            // Paket siparişin bileti "PAKET #123 · Moda" olarak görünür.
            Dictionary<Guid, DeliveryScope.DeliveryLabel> deliveryLabels = await _db.LoadDeliveryLabelsAsync(orders, cancellationToken);

            return Result<List<OrderDto>>.Success(orders.Select(o =>
            {
                // Menü satırları yerine içindeki ürünler gelir; kategori süzgeci de bu ürünlere uygulanır.
                var dto = o.ToKitchenDto();
                if (categoryIds is not null)
                {
                    HashSet<Guid> visibleItemIds = o.OrderItems
                        .Where(i => i.Product is not null && categoryIds.Contains(i.Product.CategoryId))
                        .Select(i => i.Id)
                        .ToHashSet();
                    dto.OrderItems = dto.OrderItems.Where(i => visibleItemIds.Contains(i.Id)).ToList();
                    // Mutfak ekranında tutar gösterilmez; yine de görünen ürünlerle tutarlı olsun.
                    dto.TotalPrice = dto.OrderItems.Sum(i => i.UnitPrice * i.Quantity);
                }
                dto.CreatedByUserName = creatorNameById.GetValueOrDefault(o.CreatedUser, string.Empty);
                dto.ApplyDeliveryLabel(deliveryLabels);
                return dto;
            }).ToList());
        }
    }
}
