using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.DTOs;
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

            List<Order> orders = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Table)
                .Include(o => o.OrderItems).ThenInclude(i => i.Product)
                .Where(o => !excludedStatuses.Contains(o.Status) && o.Table.Region.BranchId == restaurantId)
                .ToListAsync(cancellationToken);

            List<Guid> creatorIds = orders.Select(o => o.CreatedUser).Distinct().ToList();
            Dictionary<Guid, string> creatorNameById = await _db.Users
                .AsNoTracking()
                .Where(u => creatorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

            return Result<List<OrderDto>>.Success(orders.Select(o =>
            {
                var dto = o.ToDto();
                dto.CreatedByUserName = creatorNameById.GetValueOrDefault(o.CreatedUser, string.Empty);
                return dto;
            }).ToList());
        }
    }
}
