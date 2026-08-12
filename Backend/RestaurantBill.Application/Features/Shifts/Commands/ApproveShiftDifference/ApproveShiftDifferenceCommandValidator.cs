using FluentValidation;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftDifference;

public class ApproveShiftDifferenceCommandValidator : AbstractValidator<ApproveShiftDifferenceCommand>
{
    public ApproveShiftDifferenceCommandValidator()
    {
        RuleFor(x => x.ShiftId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz vardiya Id.");
    }
}
