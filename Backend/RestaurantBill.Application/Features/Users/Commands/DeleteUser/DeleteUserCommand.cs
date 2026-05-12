using MediatR;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommand : IRequest
    {
        public string UserId { get; set; } = string.Empty;
    }
}