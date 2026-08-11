using FluentValidation;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftOpeningDifference;

public class ApproveShiftOpeningDifferenceCommandValidator : AbstractValidator<ApproveShiftOpeningDifferenceCommand>
{
    public ApproveShiftOpeningDifferenceCommandValidator()
    {
        RuleFor(x => x.ShiftId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz vardiya Id.");
    }
}
