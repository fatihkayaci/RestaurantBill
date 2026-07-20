using FluentValidation;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;

public class TransferBetweenCashRegistersCommandValidator : AbstractValidator<TransferBetweenCashRegistersCommand>
{
    public TransferBetweenCashRegistersCommandValidator()
    {
        RuleFor(x => x.SourceCashRegisterId).GreaterThan(0).WithMessage("Geçersiz kaynak kasa Id.");
        RuleFor(x => x.DestinationCashRegisterId).GreaterThan(0).WithMessage("Geçersiz hedef kasa Id.");
        RuleFor(x => x.DestinationCashRegisterId).NotEqual(x => x.SourceCashRegisterId).WithMessage("Kaynak ve hedef kasa aynı olamaz.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
    }
}
