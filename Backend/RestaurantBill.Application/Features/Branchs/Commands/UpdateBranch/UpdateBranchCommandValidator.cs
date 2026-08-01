using System.Text.RegularExpressions;
using FluentValidation;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch;

public class UpdateBranchCommandValidator : AbstractValidator<UpdateBranchCommand>
{
    public UpdateBranchCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz şube.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Restoran adı boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Restoran adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.ManagerName)
            .MaximumLength(100).WithMessage("Yönetici adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20).WithMessage("Telefon numarası en fazla 20 karakter olabilir.")
            .Must(BeAValidPhoneNumber).WithMessage("Geçerli bir telefon numarası giriniz.");

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.")
            .When(x => !string.IsNullOrEmpty(x.Email));

        RuleFor(x => x.City)
            .MaximumLength(50).WithMessage("Şehir en fazla 50 karakter olabilir.");

        RuleFor(x => x.District)
            .MaximumLength(50).WithMessage("İlçe en fazla 50 karakter olabilir.");

        RuleFor(x => x.OpenAddress)
            .MaximumLength(250).WithMessage("Açık adres en fazla 250 karakter olabilir.");
    }

    private static bool BeAValidPhoneNumber(string phoneNumber)
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
