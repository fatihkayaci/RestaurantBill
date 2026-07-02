using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Memberships.Queries.GetMembershipByRestaurantId
{
    public class GetMembershipByRestaurantIdQueryHandler : IRequestHandler<GetMembershipByRestaurantIdQuery, MembershipDto>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetMembershipByRestaurantIdQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<MembershipDto> Handle(GetMembershipByRestaurantIdQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            IEnumerable<Membership> memberships = await _uow.Membership.GetAllAsync(x => x.RestaurantId == restaurantId, false);
            Membership membership = memberships.FirstOrDefault()
                ?? throw new NotFoundException("Üyelik bulunamadı.");
            return membership.ToDto();
        }
    }
}
