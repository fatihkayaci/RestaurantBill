using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Auths.Commands.Register
{
    public class RegisterCommand: IRequest, IIdempotent
    {
        public required string FullName { get; set; }
        public required string UserName { get; set; }
        public required string Email { get; set; }
        public required string UserCode { get; set; }
        public required string Password { get; set; }

        public string IdempotencyKey => $"register:{UserName}";
    }
}