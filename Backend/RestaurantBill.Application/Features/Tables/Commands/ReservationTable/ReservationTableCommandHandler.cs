using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable
{
    public class ReservationTableCommandHandler : IRequestHandler<ReservationTableCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;

        public ReservationTableCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
        }

        /// <summary>
        /// Reserves the table and sets its status to Reserved.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if table ID is invalid or table is not found.</exception>
        public async Task Handle(ReservationTableCommand request, CancellationToken cancellationToken)
        {
            if (request.TableId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");

            var table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");

            table.Status = TableStatus.Reserved;
            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(table.Id, (int)table.Status);
        }
    }
}