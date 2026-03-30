using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId
{
    public class GetUserByRestaurantIdCommand : IRequest<IEnumerable<UserDto>> 
    {
    }
}