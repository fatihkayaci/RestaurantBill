using FluentValidation;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.AddTransaction;

public class AddCashTransactionValidator : AbstractValidator<AddCashTransactionCommand>
{
    public AddCashTransactionValidator()
    {
        RuleFor(x => x.CashRegisterId).GreaterThan(0).WithMessage("Geçersiz kasa Id.");
        RuleFor(x => x.Type).IsInEnum().WithMessage("Geçersiz işlem tipi.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
    }
}
