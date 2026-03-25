using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Validators.Restaurant;

public class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        /*
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email adresinizi girmelisiniz.")
            .EmailAddress().WithMessage("Geçerli bir email formatı giriniz.");
        */
        RuleFor(x => x.UserName)
            .NotEmpty().WithMessage("Ad alanı boş bırakılamaz.")
            .MaximumLength(50);

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Lütfen şifrenizi giriniz.");
    }
}