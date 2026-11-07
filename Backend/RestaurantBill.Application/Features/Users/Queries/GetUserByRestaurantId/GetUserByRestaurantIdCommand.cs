using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId
{
    public class GetUserByRestaurantIdCommand : IRequest<Result<IEnumerable<UserDto>>>
    {
        // Owner şube modundayken de şirketin tüm şubelerini görmek için (Adminler sayfası). Admin için etkisizdir.
        public bool AllBranches { get; set; }
    }
}