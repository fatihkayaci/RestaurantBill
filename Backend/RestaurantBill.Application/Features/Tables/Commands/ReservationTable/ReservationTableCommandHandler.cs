using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable
{
    public class ReservationTableCommandHandler : IRequestHandler<ReservationTableCommand>
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

        public async Task Handle(ReservationTableCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");

            table.Reserve();

            TimeSpan timeOfDay = TimeSpan.Parse(request.ReservationTime);
            DateTime reservationTime = DateTime.UtcNow.Date.Add(timeOfDay);

            Reservation reservation = Reservation.Create(table, request.GuestName, request.Contact, reservationTime, request.Note);
            await _uow.Reservation.AddAsync(reservation);

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.RestaurantId, table.Id, (int)table.Status);
        }
    }
}
