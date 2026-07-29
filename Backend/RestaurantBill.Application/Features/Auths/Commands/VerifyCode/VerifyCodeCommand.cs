using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.VerifyCode
{
    public class VerifyCodeCommand : IRequest<Result>
    {
        public int UserId { get; set; }
        public string Code { get; set; } = string.Empty;
    }
}
