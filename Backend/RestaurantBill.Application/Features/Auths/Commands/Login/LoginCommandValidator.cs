using FluentValidation;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Auths.Commands.Login;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator(ITenantResolver tenantResolver)
    {
        RuleFor(x => x).Must(x =>
            !string.IsNullOrEmpty(x.UserName) || !string.IsNullOrEmpty(x.Email))
            .WithMessage("Kullanıcı adı veya email zorunludur.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Restoran belirlenemediği için kullanıcı adıyla giriş yapılamaz, email zorunludur.")
            .When(x => string.IsNullOrWhiteSpace(tenantResolver.Slug));
    }
}