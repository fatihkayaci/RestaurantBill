using MediatR;

namespace RestaurantBill.Application.Features.Auths.Commands.Login
{
    public class LoginCommand: IRequest<string>
    {
        public required string UserName { get; set; }
        public required string Password { get; set; }
    }
}