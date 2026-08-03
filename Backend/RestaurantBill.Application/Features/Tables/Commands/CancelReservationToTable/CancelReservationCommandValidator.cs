using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable;

public class CancelReservationCommandValidator : AbstractValidator<CancelReservationCommand>
{
    public CancelReservationCommandValidator()
    {
        RuleFor(x => x.TableId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
