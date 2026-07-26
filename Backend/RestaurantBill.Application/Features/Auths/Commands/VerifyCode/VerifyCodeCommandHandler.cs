using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.VerifyCode
{
    public class VerifyCodeCommandHandler : IRequestHandler<VerifyCodeCommand, Result>
    {
        private readonly IUnitOfWork _uow;

        public VerifyCodeCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<Result> Handle(VerifyCodeCommand request, CancellationToken cancellationToken)
        {
            VerificationCode? verificationCode = (await _uow.VerificationCode.GetAllAsync(
                vc => vc.UserId == request.UserId && vc.Status == VerificationCodeStatus.Pending && !vc.IsDeleted,
                true))
                .OrderByDescending(vc => vc.CreatedAt)
                .FirstOrDefault();

            if (verificationCode is null)
                return Result.Failure("Doğrulama kodu bulunamadı.");

            if (verificationCode.ExpiresAt < DateTime.UtcNow)
                return Result.Failure("Doğrulama kodunun süresi dolmuş.");

            if (verificationCode.Code != request.Code)
            {
                verificationCode.IncrementAttempt();
                await _uow.SaveChangesAsync(cancellationToken);
                return Result.Failure("Doğrulama kodu hatalı.");
            }

            verificationCode.MarkAsVerified();
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
