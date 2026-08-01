using FluentValidation;
namespace RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;

public class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir kategori seçilmelidir.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kategori adı boş olamaz.")
            .MaximumLength(50).WithMessage("Kategori adı en fazla 50 karakter olabilir.");
    }
}
