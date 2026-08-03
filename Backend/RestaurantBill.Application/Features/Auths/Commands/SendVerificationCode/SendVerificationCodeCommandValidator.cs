using FluentValidation;

namespace RestaurantBill.Application.Features.Auths.Commands.SendVerificationCode;

public class SendVerificationCodeCommandValidator : AbstractValidator<SendVerificationCodeCommand>
{
    public SendVerificationCodeCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz kullanıcı.");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Geçerli bir doğrulama tipi seçilmelidir.");
    }
}
