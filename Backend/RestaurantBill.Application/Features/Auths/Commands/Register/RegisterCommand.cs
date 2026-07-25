using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Register
{
    public class RegisterCommand: IRequest<Result<string>>, IIdempotent
    {
        public required string FullName { get; set; }
        public required string UserName { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string RestaurantName { get; set; }

        public string IdempotencyKey => $"register:{UserName}";
    }
}