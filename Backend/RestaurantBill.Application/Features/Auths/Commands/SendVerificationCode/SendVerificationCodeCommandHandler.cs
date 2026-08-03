using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.SendVerificationCode
{
    public class SendVerificationCodeCommandHandler : IRequestHandler<SendVerificationCodeCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ISmsSender _smsSender;
        private readonly IEmailSender _emailSender;

        public SendVerificationCodeCommandHandler(IUnitOfWork uow, ISmsSender smsSender, IEmailSender emailSender)
        {
            _uow = uow;
            _smsSender = smsSender;
            _emailSender = emailSender;
        }

        public async Task<Result> Handle(SendVerificationCodeCommand request, CancellationToken cancellationToken)
        {
            User? user = await _uow.User.GetByIdAsync(request.UserId, true);
            if (user is null) return Result.Failure("Kullanıcı bulunamadı.");

            if (request.Type == VerificationCodeType.Phone && string.IsNullOrWhiteSpace(user.PhoneNumber))
                return Result.Failure("Kullanıcının telefon numarası yok.");

            if (request.Type == VerificationCodeType.Email && string.IsNullOrWhiteSpace(user.Email))
                return Result.Failure("Kullanıcının e-posta adresi yok.");

            string code = Random.Shared.Next(100000, 999999).ToString();
            VerificationCode verificationCode = VerificationCode.Create(user.Id, code, request.Type, DateTime.UtcNow.AddMinutes(5));

            await _uow.VerificationCode.AddAsync(verificationCode);
            await _uow.SaveChangesAsync(cancellationToken);

            if (request.Type == VerificationCodeType.Phone)
                await _smsSender.SendAsync(user.PhoneNumber!, $"Doğrulama kodunuz: {code}");
            else
                await _emailSender.SendAsync(user.Email!, "Doğrulama Kodu", $"Doğrulama kodunuz: {code}");

            return Result.Success();
        }
    }
}
