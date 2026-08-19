using FluentValidation;

namespace RestaurantBill.Application.Features.Auths.Commands.VerifyCode;

public class VerifyCodeCommandValidator : AbstractValidator<VerifyCodeCommand>
{
    public VerifyCodeCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz kullanıcı.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Doğrulama kodu boş bırakılamaz.");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Geçerli bir doğrulama tipi seçilmelidir.");
    }
}
