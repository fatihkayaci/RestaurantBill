using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Memberships.Queries.GetMembershipByRestaurantId
{
    public class GetMembershipByRestaurantIdQueryHandler : IRequestHandler<GetMembershipByRestaurantIdQuery, Result<MembershipDto>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetMembershipByRestaurantIdQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<MembershipDto>> Handle(GetMembershipByRestaurantIdQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            var membership = await _db.Memberships
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == restaurantId, cancellationToken);
            if (membership is null)
            {
                return Result<MembershipDto>.Failure("Üyelik bulunamadı.");
            }
            return Result<MembershipDto>.Success(membership.ToDto());
        }
    }
}
