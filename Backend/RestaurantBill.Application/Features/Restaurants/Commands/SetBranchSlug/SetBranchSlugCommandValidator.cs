using FluentValidation;

namespace RestaurantBill.Application.Features.Restaurants.Commands.SetBranchSlug;

public class SetBranchSlugCommandValidator : AbstractValidator<SetBranchSlugCommand>
{
    public SetBranchSlugCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .GreaterThan(0).WithMessage("Geçersiz şube.");

        RuleFor(x => x.Slug)
            .NotEmpty().WithMessage("Adres boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Adres en fazla 50 karakter olabilir.");
    }
}
