using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable;
public class OpenTableCommandValidator : AbstractValidator<OpenTableCommand>
{
    public OpenTableCommandValidator()
    {
        RuleFor(x => x.TableId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
