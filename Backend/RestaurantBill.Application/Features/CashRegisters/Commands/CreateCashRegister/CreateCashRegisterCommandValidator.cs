using FluentValidation;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.CreateCashRegister;

public class CreateCashRegisterValidator : AbstractValidator<CreateCashRegisterCommand>
{
    public CreateCashRegisterValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kasa adı boş olamaz.")
            .MaximumLength(50).WithMessage("Kasa adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.OpeningBalance)
            .GreaterThanOrEqualTo(0).WithMessage("Açılış bakiyesi negatif olamaz.");

        RuleFor(x => x.Status)
            .IsInEnum().WithMessage("Geçersiz durum.");
    }
}
