using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.Tables.Queries;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable
{
    public class CancelReservationCommandHandler : IRequestHandler<CancelReservationCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ReservationQueries _reservationQueries;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public CancelReservationCommandHandler(IAppDbContext db, ReservationQueries reservationQueries, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _reservationQueries = reservationQueries;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(CancelReservationCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _db.Tables
                .FirstOrDefaultAsync(t => t.Id == request.TableId, cancellationToken);
            if (table is null)
                return Result.Failure("Böyle bir masa bulunamadı.");

            table.Release();

            Reservation? reservation = await _reservationQueries.GetActiveReservationByTableIdAsync(request.TableId, trackChanges: true, cancellationToken);
            reservation?.Cancel();

            await _db.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
            return Result.Success();
        }
    }
}
