using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.VerifyCode
{
    public class VerifyCodeCommandHandler : IRequestHandler<VerifyCodeCommand, Result<VerifyCodeResponseDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;

        public VerifyCodeCommandHandler(IUnitOfWork uow, IJwtTokenGenerator jwtTokenGenerator)
        {
            _uow = uow;
            _jwtTokenGenerator = jwtTokenGenerator;
        }

        public async Task<Result<VerifyCodeResponseDto>> Handle(VerifyCodeCommand request, CancellationToken cancellationToken)
        {
            VerificationCode? verificationCode = (await _uow.VerificationCode.GetAllAsync(
                vc => vc.UserId == request.UserId && vc.Status == VerificationCodeStatus.Pending && !vc.IsDeleted,
                true))
                .OrderByDescending(vc => vc.CreatedAt)
                .FirstOrDefault();

            if (verificationCode is null)
                return Result<VerifyCodeResponseDto>.Failure("Doğrulama kodu bulunamadı.");

            if (verificationCode.ExpiresAt < DateTime.UtcNow)
                return Result<VerifyCodeResponseDto>.Failure("Doğrulama kodunun süresi dolmuş.");

            if (verificationCode.Code != request.Code)
            {
                verificationCode.IncrementAttempt();
                await _uow.SaveChangesAsync(cancellationToken);
                return Result<VerifyCodeResponseDto>.Failure("Doğrulama kodu hatalı.");
            }

            User? user = await _uow.User.GetByIdAsync(request.UserId, false);
            if (user is null)
                return Result<VerifyCodeResponseDto>.Failure("Kullanıcı bulunamadı.");

            Restaurant? restaurant = (await _uow.Restaurant.GetAllAsync(
                r => r.OwnerUserId == request.UserId && !r.IsDeleted, false)).FirstOrDefault();
            if (restaurant is null)
                return Result<VerifyCodeResponseDto>.Failure("Restoran bulunamadı.");

            verificationCode.MarkAsVerified();
            await _uow.SaveChangesAsync(cancellationToken);

            return Result<VerifyCodeResponseDto>.Success(new VerifyCodeResponseDto
            {
                Token = _jwtTokenGenerator.GenerateToken(user, restaurant.Id, UserRole.Owner, user.Email!),
                NeedsSlugSetup = string.IsNullOrWhiteSpace(restaurant.Slug),
            });
        }
    }
}
