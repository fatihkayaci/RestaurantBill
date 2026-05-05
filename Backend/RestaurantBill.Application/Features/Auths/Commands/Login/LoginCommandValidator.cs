using FluentValidation;

namespace RestaurantBill.Application.Features.Auths.Commands.Login;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x).Must(x => 
            !string.IsNullOrEmpty(x.UserName) || !string.IsNullOrEmpty(x.Email))
            .WithMessage("Kullanıcı adı veya email zorunludur.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.");
    }
}