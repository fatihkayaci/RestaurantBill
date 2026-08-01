using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable
{
    public class ReservationTableCommandHandler : IRequestHandler<ReservationTableCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public ReservationTableCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(ReservationTableCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.TableId, true);
            if (table is null) return Result.Failure("Böyle bir masa bulunamadı.");

            table.Reserve();

            TimeSpan timeOfDay = TimeSpan.Parse(request.ReservationTime);
            DateTime reservationTime = DateTime.UtcNow.Date.Add(timeOfDay);

            Reservation reservation = Reservation.Create(table, request.GuestName, request.Contact, reservationTime, request.Note);
            await _uow.Reservation.AddAsync(reservation);

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
            return Result.Success();
        }
    }
}
