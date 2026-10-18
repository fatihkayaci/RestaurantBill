using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId
{
    public class GetActiveOrderByTableIdHandler : IRequestHandler<GetActiveOrderByTableIdQuery, Result<OrderDto?>>
    {
        private readonly OrderQueries _orderQueries;
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetActiveOrderByTableIdHandler(OrderQueries orderQueries, IAppDbContext db, ICurrentUserService currentUser)
        {
            _orderQueries = orderQueries;
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<OrderDto?>> Handle(GetActiveOrderByTableIdQuery request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);
            bool tableAccessible = await _db.Tables.InBranches(branchIds).AnyAsync(t => t.Id == request.TableId, cancellationToken);
            if (!tableAccessible)
                return Result<OrderDto?>.Failure("Böyle bir masa bulunamadı.");

            var order = await _orderQueries.GetActiveOrderByTableIdAsync(request.TableId, trackChanges: false, cancellationToken);
            return Result<OrderDto?>.Success(order?.ToDto());
        }
    }
}
