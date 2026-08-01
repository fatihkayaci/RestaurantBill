using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.VerifyCode
{
    public class VerifyCodeCommand : IRequest<Result<VerifyCodeResponseDto>>
    {
        public Guid UserId { get; set; }
        public string Code { get; set; } = string.Empty;
    }
}
