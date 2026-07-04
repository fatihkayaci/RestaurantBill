using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable
{
    public class CancelReservationCommandHandler : IRequestHandler<CancelReservationCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;

        public CancelReservationCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
        }

        public async Task Handle(CancelReservationCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");

            table.Release();

            Reservation? reservation = await _uow.Reservation.GetActiveReservationByTableId(request.TableId, true);
            reservation?.Cancel();

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(table.Id, (int)table.Status);
        }
    }
}
