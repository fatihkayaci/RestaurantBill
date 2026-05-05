using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable;

public class ReservationTableCommandValidator : AbstractValidator<ReservationTableCommand>
{
    public ReservationTableCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
