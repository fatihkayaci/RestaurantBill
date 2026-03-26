using FluentValidation;
using RestaurantBill.Application.Features.Tables.Commands.CancelReservation;

namespace RestaurantBill.Application.Validators.Table;

public class CancelReservationCommandValidator : AbstractValidator<CancelReservationCommand>
{
    public CancelReservationCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
