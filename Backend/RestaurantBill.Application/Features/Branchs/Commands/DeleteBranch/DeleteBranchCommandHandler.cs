using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.DeleteBranch
{
    // Şube yumuşak silinir (IsDeleted): geçmiş adisyon, ödeme, vardiya ve kayıtlar FK'larıyla yerinde kalır ve raporlarda görünür.
    // Kalıcı silme (Remove) bu geçmişi ya FK hatasıyla engellerdi ya da zincirleme silerdi.
    public class DeleteBranchCommandHandler : IRequestHandler<DeleteBranchCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public DeleteBranchCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(DeleteBranchCommand request, CancellationToken cancellationToken)
        {
            Branch? branch = await _db.Branches
                .Include(b => b.Company)
                .FirstOrDefaultAsync(b => b.Id == request.BranchId && !b.IsDeleted, cancellationToken);
            if (branch is null || branch.Company.OwnerUserId != _currentUser.UserId || branch.Company.IsDeleted)
                return Result.Failure("Şube bulunamadı.");

            Guid branchId = branch.Id;
            DateTime nowUtc = DateTime.UtcNow;

            int otherBranches = await _db.Branches
                .CountAsync(b => b.CompanyId == branch.CompanyId && b.Id != branchId && !b.IsDeleted, cancellationToken);
            // Silinen çalışanın şube bağlantısı kalır (yalnız kullanıcı silinmiş sayılır); onlar personel sayılmaz.
            int staff = await _db.UserBranches
                .CountAsync(ub => ub.BranchId == branchId && !ub.IsDeleted
                    && _db.Users.Any(u => u.Id == ub.UserId && !u.IsDeleted), cancellationToken);
            int openOrders = await _db.Orders
                .CountAsync(o => o.BranchId == branchId && !o.IsDeleted
                    && o.OrderType != OrderType.Delivery && o.OrderType != OrderType.Takeaway
                    && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled, cancellationToken);
            int openShifts = await _db.Shifts
                .CountAsync(s => s.BranchId == branchId && s.Status == ShiftStatus.Open, cancellationToken);
            int openDeliveries = await _db.DeliveryOrders
                .CountAsync(d => d.BranchId == branchId && !d.IsDeleted
                    && d.Status != DeliveryOrderStatus.Delivered
                    && d.Status != DeliveryOrderStatus.Rejected
                    && d.Status != DeliveryOrderStatus.Cancelled, cancellationToken);
            // Bitiş saati olmayan eski kayıtlar başlangıçtan itibaren sayılır; geçmiş saatte kalmış talepler engel değildir.
            int upcomingReservations = await _db.Reservations
                .CountAsync(r => r.Table.Region.BranchId == branchId && !r.IsDeleted
                    && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Confirmed || r.Status == ReservationStatus.Active)
                    && (r.EndTime ?? r.ReservationTime) > nowUtc, cancellationToken);

            branch.Delete(new BranchDeletionBlockers(otherBranches, staff, openOrders, openShifts, openDeliveries, upcomingReservations));

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                branch.Id,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Warning,
                "BranchDeleted",
                $"{actor?.FullName} {branch.BranchName} şubesini sildi.",
                nameof(Branch),
                branch.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
