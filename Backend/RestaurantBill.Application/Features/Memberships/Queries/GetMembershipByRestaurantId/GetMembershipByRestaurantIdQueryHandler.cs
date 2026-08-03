using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Memberships.Queries.GetMembershipByRestaurantId
{
    public class GetMembershipByRestaurantIdQueryHandler : IRequestHandler<GetMembershipByRestaurantIdQuery, Result<MembershipDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetMembershipByRestaurantIdQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<MembershipDto>> Handle(GetMembershipByRestaurantIdQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            IEnumerable<Membership> memberships = await _uow.Membership.GetAllAsync(x => x.BranchId == restaurantId, false);
            Membership? membership = memberships.FirstOrDefault();
            if (membership is null)
            {
                return Result<MembershipDto>.Failure("Üyelik bulunamadı.");
            }
            return Result<MembershipDto>.Success(membership.ToDto());
        }
    }
}
