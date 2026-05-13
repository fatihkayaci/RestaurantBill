using FluentValidation;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.UpdateCashRegister;

public class UpdateCashRegisterValidator : AbstractValidator<UpdateCashRegisterCommand>
{
    public UpdateCashRegisterValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0).WithMessage("Geçersiz kasa Id.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kasa adı boş olamaz.")
            .MaximumLength(50).WithMessage("Kasa adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.Balance)
            .GreaterThanOrEqualTo(0).WithMessage("Bakiye negatif olamaz.");

        RuleFor(x => x.Status)
            .IsInEnum().WithMessage("Geçersiz durum.");
    }
}
