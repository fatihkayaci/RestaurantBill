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

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20).WithMessage("Telefon numarası en fazla 20 karakter olabilir.");

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.")
            .When(x => !string.IsNullOrEmpty(x.Email));

        RuleFor(x => x.City)
            .MaximumLength(50).WithMessage("Şehir en fazla 50 karakter olabilir.");

        RuleFor(x => x.District)
            .MaximumLength(50).WithMessage("İlçe en fazla 50 karakter olabilir.");
    }
}
