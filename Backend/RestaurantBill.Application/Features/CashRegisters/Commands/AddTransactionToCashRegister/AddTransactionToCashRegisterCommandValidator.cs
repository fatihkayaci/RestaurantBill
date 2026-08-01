using FluentValidation;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;

public class AddTransactionToCashRegisterCommandValidator : AbstractValidator<AddTransactionToCashRegisterCommand>
{
    public AddTransactionToCashRegisterCommandValidator()
    {
        RuleFor(x => x.CashRegisterId).NotEqual(Guid.Empty).WithMessage("Geçersiz kasa Id.");
        RuleFor(x => x.Type).IsInEnum().WithMessage("Geçersiz işlem tipi.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
    }
}
