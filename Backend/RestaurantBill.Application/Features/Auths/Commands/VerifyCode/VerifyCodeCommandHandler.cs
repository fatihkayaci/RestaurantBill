using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.VerifyCode
{
    public class VerifyCodeCommandHandler : IRequestHandler<VerifyCodeCommand, Result<VerifyCodeResponseDto>>
    {
        private readonly IAppDbContext _db;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;

        public VerifyCodeCommandHandler(IAppDbContext db, IJwtTokenGenerator jwtTokenGenerator)
        {
            _db = db;
            _jwtTokenGenerator = jwtTokenGenerator;
        }

        private const int MaxAttempts = 5;

        public async Task<Result<VerifyCodeResponseDto>> Handle(VerifyCodeCommand request, CancellationToken cancellationToken)
        {
            VerificationCode? verificationCode = await _db.VerificationCodes
                .Where(vc => vc.UserId == request.UserId && vc.Type == request.Type && vc.Status == VerificationCodeStatus.Pending && !vc.IsDeleted)
                .OrderByDescending(vc => vc.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (verificationCode is null)
                return Result<VerifyCodeResponseDto>.Failure("Doğrulama kodu bulunamadı.");

            if (verificationCode.ExpiresAt < DateTime.UtcNow)
            {
                verificationCode.MarkAsExpired();
                await _db.SaveChangesAsync(cancellationToken);
                return Result<VerifyCodeResponseDto>.Failure("Doğrulama kodunun süresi dolmuş.");
            }

            if (verificationCode.Code != request.Code)
            {
                verificationCode.IncrementAttempt();

                string errorMessage;
                if (verificationCode.Attempts >= MaxAttempts)
                {
                    verificationCode.MarkAsFailed();
                    errorMessage = "Çok fazla hatalı deneme yapıldı. Lütfen yeni bir kod isteyin.";
                }
                else
                {
                    errorMessage = "Doğrulama kodu hatalı.";
                }

                await _db.SaveChangesAsync(cancellationToken);
                return Result<VerifyCodeResponseDto>.Failure(errorMessage);
            }

            User? user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (user is null)
                return Result<VerifyCodeResponseDto>.Failure("Kullanıcı bulunamadı.");

            if (request.Type == VerificationCodeType.Phone)
            {
                Company? company = await _db.Companies
                    .FirstOrDefaultAsync(c => c.OwnerUserId == request.UserId && !c.IsDeleted, cancellationToken);
                if (company is null)
                    return Result<VerifyCodeResponseDto>.Failure("Restoran bulunamadı.");

                verificationCode.MarkAsVerified();
                user.MarkPhoneVerified();
                await _db.SaveChangesAsync(cancellationToken);

                return Result<VerifyCodeResponseDto>.Success(new VerifyCodeResponseDto
                {
                    Token = _jwtTokenGenerator.GenerateToken(user, company.Id, UserRole.Owner, user.Email!),
                    NeedsSlugSetup = string.IsNullOrWhiteSpace(company.Slug),
                });
            }

            verificationCode.MarkAsVerified();
            user.MarkEmailVerified();
            await _db.SaveChangesAsync(cancellationToken);

            return Result<VerifyCodeResponseDto>.Success(new VerifyCodeResponseDto());
        }
    }
}
