using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Validators.Restaurant;

public class UpdateRestaurantDtoValidator : AbstractValidator<UpdateRestaurantDto>
{
    public UpdateRestaurantDtoValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("Geçersiz bir restoran seçtiniz.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Restoran adı boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Restoran adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .MaximumLength(20).WithMessage("Telefon numarası en fazla 20 karakter olabilir.");

        RuleFor(x => x.MobilePhoneNumber)
            .MaximumLength(20).WithMessage("Cep telefonu numarası en fazla 20 karakter olabilir.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi boş bırakılamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.City)
            .NotEmpty().WithMessage("Şehir boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Şehir en fazla 50 karakter olabilir.");

        RuleFor(x => x.District)
            .NotEmpty().WithMessage("İlçe boş bırakılamaz.")
            .MaximumLength(50).WithMessage("İlçe en fazla 50 karakter olabilir.");
    }
}
