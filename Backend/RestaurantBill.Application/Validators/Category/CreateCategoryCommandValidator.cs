using FluentValidation;
using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;

namespace RestaurantBill.Application.Validators.Category;

public class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
         RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kategori adı boş olamaz.")
            .MaximumLength(50).WithMessage("Kategori adı en fazla 50 karakter olabilir.");
    }
}