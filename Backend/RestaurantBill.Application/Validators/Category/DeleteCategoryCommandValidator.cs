using FluentValidation;
using RestaurantBill.Application.Features.Categories.Commands.DeleteCategory;

namespace RestaurantBill.Application.Validators.Category;

public class DeleteCategoryCommandValidator : AbstractValidator<DeleteCategoryCommand>
{
    public DeleteCategoryCommandValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("Geçerli bir kategori seçilmelidir.");
    }
}
