using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Logout;

public class LogoutCommand : IRequest<Result>
{
    public required string RefreshToken { get; set; }
}
