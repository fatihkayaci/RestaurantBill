using FluentValidation;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;

namespace RestaurantBill.Application.Validators.Table;

public class ReservationTableCommandValidator : AbstractValidator<ReservationTableCommand>
{
    public ReservationTableCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
