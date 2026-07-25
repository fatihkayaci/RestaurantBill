using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Memberships.Queries.GetMembershipByRestaurantId
{
    public class GetMembershipByRestaurantIdQuery : IRequest<Result<MembershipDto>>
    {
    }
}
