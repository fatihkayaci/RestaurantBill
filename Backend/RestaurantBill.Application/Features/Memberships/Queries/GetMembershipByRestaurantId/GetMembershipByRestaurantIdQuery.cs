using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Memberships.Queries.GetMembershipByRestaurantId
{
    public class GetMembershipByRestaurantIdQuery : IRequest<MembershipDto>
    {
    }
}
