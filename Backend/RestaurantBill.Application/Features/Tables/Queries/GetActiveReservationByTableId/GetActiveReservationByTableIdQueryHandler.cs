using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Queries.GetActiveReservationByTableId
{
    public class GetActiveReservationByTableIdQueryHandler : IRequestHandler<GetActiveReservationByTableIdQuery, Result<ReservationDto>>
    {
        private readonly ReservationQueries _reservationQueries;
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetActiveReservationByTableIdQueryHandler(ReservationQueries reservationQueries, IAppDbContext db, ICurrentUserService currentUser)
        {
            _reservationQueries = reservationQueries;
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<ReservationDto>> Handle(GetActiveReservationByTableIdQuery request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);
            bool tableAccessible = await _db.Tables.InBranches(branchIds).AnyAsync(t => t.Id == request.TableId, cancellationToken);
            if (!tableAccessible)
                return Result<ReservationDto>.Failure("Böyle bir masa bulunamadı.");

            var reservation = await _reservationQueries.GetActiveReservationByTableIdAsync(request.TableId, trackChanges: false, cancellationToken);
            if (reservation is null) return Result<ReservationDto>.Failure("Bu masaya ait bir reservasyon bulunamadı.");
            return Result<ReservationDto>.Success(reservation.ToDto());
        }
    }
}
