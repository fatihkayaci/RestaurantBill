using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservation;

public class CancelReservationCommandValidator : AbstractValidator<CancelReservationCommand>
{
    public CancelReservationCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
