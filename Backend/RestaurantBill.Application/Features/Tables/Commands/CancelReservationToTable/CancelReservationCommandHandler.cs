using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable
{
    public class CancelReservationCommandHandler : IRequestHandler<CancelReservationCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public CancelReservationCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(CancelReservationCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.TableId, true);
            if (table is null)
                return Result.Failure("Böyle bir masa bulunamadı.");

            table.Release();

            Reservation? reservation = await _uow.Reservation.GetActiveReservationByTableId(request.TableId, true);
            reservation?.Cancel();

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.RestaurantId, table.Id, (int)table.Status);
            return Result.Success();
        }
    }
}
