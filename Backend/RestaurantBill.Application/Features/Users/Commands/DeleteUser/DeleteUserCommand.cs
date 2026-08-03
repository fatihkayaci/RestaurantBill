using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommand : IRequest<Result>
    {
        public Guid UserId { get; set; }
    }
}