using MediatR;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.SendVerificationCode
{
    public class SendVerificationCodeCommand : IRequest<Result>
    {
        public Guid UserId { get; set; }
        public VerificationCodeType Type { get; set; }
    }
}
