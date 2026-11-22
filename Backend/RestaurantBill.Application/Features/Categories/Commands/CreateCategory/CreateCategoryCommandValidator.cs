using FluentValidation;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory;

public class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
         RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kategori adı boş olamaz.")
            .MaximumLength(50).WithMessage("Kategori adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.TaxRate)
            .InclusiveBetween(0, 100).WithMessage("KDV oranı 0 ile 100 arasında olmalıdır.")
            .When(x => x.TaxRate.HasValue);

        RuleFor(x => x.Availability!)
            .SetValidator(new RestaurantBill.Application.Features.Categories.CategoryAvailabilityInputValidator())
            .When(x => x.Availability is not null);
    }
}