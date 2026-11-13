using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable
{
    public class ReservationTableCommandHandler : IRequestHandler<ReservationTableCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public ReservationTableCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(ReservationTableCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Table? table = await _db.Tables
                .InBranches(branchIds).FirstOrDefaultAsync(t => t.Id == request.TableId, cancellationToken);
            if (table is null) return Result.Failure("Böyle bir masa bulunamadı.");

            string? accessError = await _db.CheckTableAccessAsync(_currentUserService, table.Id, WaiterPermission.TransferAndReserve, cancellationToken);
            if (accessError is not null) return Result.Failure(accessError);

            // Şubenin rezervasyon ayarları: kapalıysa personel de rezervasyon açamaz; masa ayarlardaki süre kadar tutulur.
            // Gün/saat aralığı ve kişi sınırı burada uygulanmaz: personel bugünün bir saati için, telefonla ya da kapıda
            // gelen misafire masa ayırır.
            Guid branchId = await _db.Regions.Where(r => r.Id == table.RegionId).Select(r => r.BranchId).FirstOrDefaultAsync(cancellationToken);
            Branch? branch = await _db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken);
            ReservationSettings settings = branch?.GetReservationSettings() ?? ReservationSettings.Default(null, null);
            if (!settings.Enabled)
                return Result.Failure("Bu şubede rezervasyonlar kapalı. Yönetici, Rezervasyonlar sayfasındaki ayarlardan açabilir.");

            table.Reserve();

            TimeSpan timeOfDay = TimeSpan.Parse(request.ReservationTime);
            DateTime reservationTime = DateTime.UtcNow.Date.Add(timeOfDay);

            Reservation reservation = Reservation.Create(table, request.GuestName, request.Contact, reservationTime, request.Note,
                reservationTime.AddMinutes(settings.DurationMinutes));
            _db.Reservations.Add(reservation);

            await _db.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
            return Result.Success();
        }
    }
}
