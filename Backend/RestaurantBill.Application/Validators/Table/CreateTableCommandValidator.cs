using FluentValidation;
using RestaurantBill.Application.Features.Tables.Commands.CreateTable;

namespace RestaurantBill.Application.Validators.Table;

public class CreateTableCommandValidator : AbstractValidator<CreateTableCommand>
{
    public CreateTableCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Masa adı boş olamaz.")
            .MaximumLength(50).WithMessage("Masa adı en fazla 50 karakter olabilir.");
    }
}
