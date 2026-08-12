using FluentValidation;

namespace RestaurantBill.Application.Features.Shifts.Commands.RejectShiftOpeningDifference;

public class RejectShiftOpeningDifferenceCommandValidator : AbstractValidator<RejectShiftOpeningDifferenceCommand>
{
    public RejectShiftOpeningDifferenceCommandValidator()
    {
        RuleFor(x => x.ShiftId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz vardiya Id.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");
    }
}
