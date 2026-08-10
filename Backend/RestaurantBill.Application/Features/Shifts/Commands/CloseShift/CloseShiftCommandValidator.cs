using FluentValidation;

namespace RestaurantBill.Application.Features.Shifts.Commands.CloseShift;

public class CloseShiftCommandValidator : AbstractValidator<CloseShiftCommand>
{
    public CloseShiftCommandValidator()
    {
        RuleFor(x => x.ShiftId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz vardiya Id.");

        RuleFor(x => x.CountedClosingBalance)
            .GreaterThanOrEqualTo(0).WithMessage("Sayılan bakiye negatif olamaz.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");
    }
}
