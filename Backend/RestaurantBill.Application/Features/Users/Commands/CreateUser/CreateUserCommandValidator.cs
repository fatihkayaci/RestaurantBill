using System.Text.RegularExpressions;
using FluentValidation;
using RestaurantBill.Domain.Enums;
namespace RestaurantBill.Application.Features.Users.Commands.CreateUser;

public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Ad soyad boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Ad soyad en fazla 100 karakter olabilir.");

        RuleFor(x => x.UserName)
            .NotEmpty().WithMessage("Kullanıcı adı boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Kullanıcı adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.")
            .When(x => !string.IsNullOrEmpty(x.Email));

        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .When(x => x.Role == UserRole.Admin);

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20).WithMessage("Telefon numarası en fazla 20 karakter olabilir.")
            .Must(BeAValidPhoneNumber).WithMessage("Geçerli bir telefon numarası giriniz.");

        RuleFor(x => x.PasswordHash)
            .NotEmpty().WithMessage("Şifre boş bırakılamaz.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.");

        RuleFor(x => x.UserCode)
            .NotEmpty().WithMessage("Kullanıcı kodu boş bırakılamaz.")
            .MaximumLength(20).WithMessage("Kullanıcı kodu en fazla 20 karakter olabilir.");

        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("Geçerli bir kullanıcı rolü seçilmelidir.");

        RuleFor(x => x.BranchId)
            .NotEmpty().WithMessage("Şube seçilmelidir.")
            .When(x => x.Role == UserRole.Admin);
    }

    private static bool BeAValidPhoneNumber(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return true;

        string digits = Regex.Replace(phoneNumber, @"\D", "");
        if (digits.StartsWith("90"))
            digits = digits[2..];
        if (digits.StartsWith("0"))
            digits = digits[1..];

        return digits.Length == 10;
    }
}
