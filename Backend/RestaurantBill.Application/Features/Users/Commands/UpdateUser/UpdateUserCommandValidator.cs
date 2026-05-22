using FluentValidation;
namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser;

public class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("Geçersiz bir kullanıcı seçtiniz.")
            .Must(id => Guid.TryParse(id, out _)).WithMessage("Geçersiz bir kullanıcı seçtiniz.");

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
            .MaximumLength(20).WithMessage("Telefon numarası en fazla 20 karakter olabilir.")
            .When(x => !string.IsNullOrEmpty(x.PhoneNumber));

        RuleFor(x => x.Password)
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.")
            .When(x => !string.IsNullOrEmpty(x.Password));

        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("Geçerli bir kullanıcı rolü seçilmelidir.");
    }
}
