using FluentValidation;

namespace RestaurantBill.Application.Features.Shifts.Commands.TakeOverShift;

public class TakeOverShiftCommandValidator : AbstractValidator<TakeOverShiftCommand>
{
    public TakeOverShiftCommandValidator()
    {
        RuleFor(x => x.CashRegisterId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz kasa Id.");

        RuleFor(x => x.CountedBalance)
            .GreaterThanOrEqualTo(0).WithMessage("Sayılan tutar negatif olamaz.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");
    }
}
