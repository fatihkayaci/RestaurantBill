using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservation
{
    public class CancelReservationHandler : IRequestHandler<CancelReservationCommand>
    {
        private readonly IUnitOfWork _uow;


        public CancelReservationHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        /// <summary>
        /// Cancels the reservation and sets the table status back to Available.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if table ID is zero or less, or if the table is not found.</exception>
        public async Task Handle(CancelReservationCommand request, CancellationToken cancellationToken)
        {
            
            if (request.TableId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");

            var table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");
            
            table.Status = TableStatus.Available;
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}