using FluentValidation;

namespace RestaurantBill.Application.Features.Shifts.Commands.OpenShift;

public class OpenShiftCommandValidator : AbstractValidator<OpenShiftCommand>
{
    public OpenShiftCommandValidator()
    {
        RuleFor(x => x.CashRegisterId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz kasa Id.");

        RuleFor(x => x.CountedBalance)
            .GreaterThanOrEqualTo(0).When(x => x.CountedBalance.HasValue).WithMessage("Sayılan tutar negatif olamaz.");
    }
}
