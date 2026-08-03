using FluentValidation;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;

public class TransferBetweenCashRegistersCommandValidator : AbstractValidator<TransferBetweenCashRegistersCommand>
{
    public TransferBetweenCashRegistersCommandValidator()
    {
        RuleFor(x => x.SourceCashRegisterId).NotEqual(Guid.Empty).WithMessage("Geçersiz kaynak kasa Id.");
        RuleFor(x => x.DestinationCashRegisterId).NotEqual(Guid.Empty).WithMessage("Geçersiz hedef kasa Id.");
        RuleFor(x => x.DestinationCashRegisterId).NotEqual(x => x.SourceCashRegisterId).WithMessage("Kaynak ve hedef kasa aynı olamaz.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Tutar sıfırdan büyük olmalı.");
    }
}
