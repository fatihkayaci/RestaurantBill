using FluentValidation;
using RestaurantBill.Application.Features.Tables.Commands.Delete;

namespace RestaurantBill.Application.Validators.Table;

public class DeleteTableCommandValidator : AbstractValidator<DeleteCommand>
{
    public DeleteTableCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
