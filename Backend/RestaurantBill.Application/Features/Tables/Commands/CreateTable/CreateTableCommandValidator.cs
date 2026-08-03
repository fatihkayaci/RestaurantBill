using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable;

public class CreateTableCommandValidator : AbstractValidator<CreateTableCommand>
{
    public CreateTableCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Masa adı boş olamaz.")
            .MaximumLength(50).WithMessage("Masa adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.RegionId)
            .NotEqual(Guid.Empty).WithMessage("Bölge seçilmelidir.");
    }
}
