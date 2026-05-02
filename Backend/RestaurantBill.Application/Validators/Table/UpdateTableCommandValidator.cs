using FluentValidation;
using RestaurantBill.Application.Features.Tables.Commands.Update;

namespace RestaurantBill.Application.Validators.Table;

public class UpdateTableCommandValidator : AbstractValidator<UpdateCommand>
{
    public UpdateTableCommandValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Masa adı boş olamaz.")
            .MaximumLength(50).WithMessage("Masa adı en fazla 50 karakter olabilir.");
    }
}
