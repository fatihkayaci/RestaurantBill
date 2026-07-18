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
            .GreaterThan(0).WithMessage("Bölge seçilmelidir.");
    }
}
