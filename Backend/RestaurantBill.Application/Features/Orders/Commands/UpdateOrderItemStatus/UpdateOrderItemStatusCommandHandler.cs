using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus
{
    public class UpdateOrderItemStatusCommandHandler : IRequestHandler<UpdateOrderItemStatusCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public UpdateOrderItemStatusCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(UpdateOrderItemStatusCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Order? order = await _db.Orders
                .Include(o => o.OrderItems)
                .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            // Garson: masanın bölgesi; kategori atanmış mutfak: ürünün kategorisi.
            StaffAccess access = await _db.GetStaffAccessAsync(_currentUserService, cancellationToken);
            string? accessError = await _db.CheckTableAccessAsync(access, order.TableId, null, cancellationToken)
                ?? await _db.CheckOrderItemCategoryAsync(access, request.OrderItemId, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            order.UpdateItemStatus(request.OrderItemId, (OrderItemStatus)request.Status);

            await _db.SaveChangesAsync(cancellationToken);

            User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order.TableId, order.TotalPrice, creator?.FullName ?? string.Empty);
            return Result.Success();
        }
    }
}
