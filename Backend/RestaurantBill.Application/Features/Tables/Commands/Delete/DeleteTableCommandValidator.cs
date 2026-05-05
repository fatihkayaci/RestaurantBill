using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.Delete;

public class DeleteTableCommandValidator : AbstractValidator<DeleteCommand>
{
    public DeleteTableCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
