using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;

namespace RestaurantBill.Application.Features.Tables.Queries.GetActiveReservationByTableId
{
    public class GetActiveReservationByTableIdQueryHandler : IRequestHandler<GetActiveReservationByTableIdQuery, ReservationDto?>
    {
        private readonly IUnitOfWork _uow;

        public GetActiveReservationByTableIdQueryHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        /// <summary>
        /// Returns the active reservation for the given table, or null if there is none.
        /// </summary>
        public async Task<ReservationDto?> Handle(GetActiveReservationByTableIdQuery request, CancellationToken cancellationToken)
        {
            var reservation = await _uow.Reservation.GetActiveReservationByTableId(request.TableId, false);
            return reservation?.ToDto();
        }
    }
}
