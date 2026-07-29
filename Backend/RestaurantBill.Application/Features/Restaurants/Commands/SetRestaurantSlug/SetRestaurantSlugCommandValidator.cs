using FluentValidation;
namespace RestaurantBill.Application.Features.Restaurants.Commands.SetRestaurantSlug;

public class SetRestaurantSlugCommandValidator : AbstractValidator<SetRestaurantSlugCommand>
{
    public SetRestaurantSlugCommandValidator()
    {
        RuleFor(x => x.Slug)
            .NotEmpty().WithMessage("Adres boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Adres en fazla 50 karakter olabilir.");
    }
}
