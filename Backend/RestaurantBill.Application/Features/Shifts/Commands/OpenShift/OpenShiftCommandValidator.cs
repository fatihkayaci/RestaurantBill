using FluentValidation;

namespace RestaurantBill.Application.Features.Shifts.Commands.OpenShift;

public class OpenShiftCommandValidator : AbstractValidator<OpenShiftCommand>
{
    public OpenShiftCommandValidator()
    {
        RuleFor(x => x.CashRegisterId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz kasa Id.");

        RuleFor(x => x.OpeningBalance)
            .GreaterThanOrEqualTo(0).WithMessage("Açılış bakiyesi negatif olamaz.");
    }
}
