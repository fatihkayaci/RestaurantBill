using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Queries.GetActiveReservationByTableId
{
    public class GetActiveReservationByTableIdQueryHandler : IRequestHandler<GetActiveReservationByTableIdQuery, Result<ReservationDto>>
    {
        private readonly ReservationQueries _reservationQueries;

        public GetActiveReservationByTableIdQueryHandler(ReservationQueries reservationQueries)
        {
            _reservationQueries = reservationQueries;
        }

        public async Task<Result<ReservationDto>> Handle(GetActiveReservationByTableIdQuery request, CancellationToken cancellationToken)
        {
            var reservation = await _reservationQueries.GetActiveReservationByTableIdAsync(request.TableId, trackChanges: false, cancellationToken);
            if (reservation is null) return Result<ReservationDto>.Failure("Bu masaya ait bir reservasyon bulunamadı.");
            return Result<ReservationDto>.Success(reservation.ToDto());
        }
    }
}
