using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Validators.Table;

public class CreateTableDtoValidator : AbstractValidator<CreateTableDto>
{
    public CreateTableDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Masa adı boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Masa adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");

        RuleFor(x => x.Status)
            .IsInEnum().WithMessage("Geçerli bir masa durumu seçilmelidir.");
    }
}
