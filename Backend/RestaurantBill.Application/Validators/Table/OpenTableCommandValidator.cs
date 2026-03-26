using FluentValidation;
using RestaurantBill.Application.Features.Tables.Commands.OpenTable;

namespace RestaurantBill.Application.Validators.Table;

public class OpenTableCommandValidator : AbstractValidator<OpenTableCommand>
{
    public OpenTableCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
