using MediatR;

namespace RestaurantBill.Application.Features.Auths.Commands.Login
{
    public class LoginCommand: IRequest<string>
    {
        public string? UserName { get; set; }
        public string? Email { get; set; }
        public required string Password { get; set; }
    }
}