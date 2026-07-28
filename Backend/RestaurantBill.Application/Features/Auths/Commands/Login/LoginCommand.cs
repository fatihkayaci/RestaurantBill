using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Login
{
    public class LoginCommand: IRequest<Result<LoginResponseDto>>
    {
        public string? UserName { get; set; }
        public string? Email { get; set; }
        public required string Password { get; set; }
    }
}