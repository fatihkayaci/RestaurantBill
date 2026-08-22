using MediatR;
using Microsoft.EntityFrameworkCore;
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
            Table? table = await _db.Tables
                .FirstOrDefaultAsync(t => t.Id == request.TableId, cancellationToken);
            if (table is null) return Result.Failure("Böyle bir masa bulunamadı.");

            table.Reserve();

            TimeSpan timeOfDay = TimeSpan.Parse(request.ReservationTime);
            DateTime reservationTime = DateTime.UtcNow.Date.Add(timeOfDay);

            Reservation reservation = Reservation.Create(table, request.GuestName, request.Contact, reservationTime, request.Note);
            _db.Reservations.Add(reservation);

            await _db.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
            return Result.Success();
        }
    }
}
