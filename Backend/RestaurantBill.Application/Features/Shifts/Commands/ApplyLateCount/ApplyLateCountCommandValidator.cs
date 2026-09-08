using FluentValidation;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApplyLateCount;

public class ApplyLateCountCommandValidator : AbstractValidator<ApplyLateCountCommand>
{
    public ApplyLateCountCommandValidator()
    {
        RuleFor(x => x.ShiftId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz vardiya Id.");

        RuleFor(x => x.CountedClosingBalance)
            .GreaterThanOrEqualTo(0).WithMessage("Sayılan bakiye negatif olamaz.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");
    }
}
