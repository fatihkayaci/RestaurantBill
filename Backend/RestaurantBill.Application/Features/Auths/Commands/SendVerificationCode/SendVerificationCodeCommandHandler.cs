using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.SendVerificationCode
{
    public class SendVerificationCodeCommandHandler : IRequestHandler<SendVerificationCodeCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ISmsSender _smsSender;
        private readonly IEmailSender _emailSender;

        public SendVerificationCodeCommandHandler(IAppDbContext db, ISmsSender smsSender, IEmailSender emailSender)
        {
            _db = db;
            _smsSender = smsSender;
            _emailSender = emailSender;
        }

        public async Task<Result> Handle(SendVerificationCodeCommand request, CancellationToken cancellationToken)
        {
            User? user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (user is null) return Result.Failure("Kullanıcı bulunamadı.");

            if (request.Type == VerificationCodeType.Phone && user.IsPhoneVerified)
                return Result.Failure("Telefon numarası zaten doğrulanmış.");

            if (request.Type == VerificationCodeType.Email && user.IsEmailVerified)
                return Result.Failure("E-posta adresi zaten doğrulanmış.");

            if (request.Type == VerificationCodeType.Phone && string.IsNullOrWhiteSpace(user.PhoneNumber))
                return Result.Failure("Kullanıcının telefon numarası yok.");

            if (request.Type == VerificationCodeType.Email && string.IsNullOrWhiteSpace(user.Email))
                return Result.Failure("Kullanıcının e-posta adresi yok.");

            List<VerificationCode> existingCodes = await _db.VerificationCodes
                .Where(vc => vc.UserId == user.Id && vc.Type == request.Type && !vc.IsDeleted)
                .ToListAsync(cancellationToken);

            VerificationCode? lastCode = existingCodes.OrderByDescending(vc => vc.CreatedAt).FirstOrDefault();
            if (lastCode is not null)
            {
                double secondsSinceLastCode = (DateTime.UtcNow - lastCode.CreatedAt).TotalSeconds;
                if (secondsSinceLastCode < 60)
                {
                    int remainingSeconds = (int)Math.Ceiling(60 - secondsSinceLastCode);
                    return Result.Failure($"Yeni kod göndermek için {remainingSeconds} saniye beklemelisiniz.");
                }
            }

            foreach (VerificationCode pendingCode in existingCodes.Where(vc => vc.Status == VerificationCodeStatus.Pending))
                pendingCode.MarkAsExpired();

            string code = Random.Shared.Next(100000, 999999).ToString();
            VerificationCode verificationCode = VerificationCode.Create(user.Id, code, request.Type, DateTime.UtcNow.AddMinutes(5));

            _db.VerificationCodes.Add(verificationCode);
            await _db.SaveChangesAsync(cancellationToken);

            if (request.Type == VerificationCodeType.Phone)
                await _smsSender.SendAsync(user.PhoneNumber!, $"Doğrulama kodunuz: {code}");
            else
                await _emailSender.SendAsync(user.Email!, "Doğrulama Kodu", $"Doğrulama kodunuz: {code}");

            return Result.Success();
        }
    }
}
