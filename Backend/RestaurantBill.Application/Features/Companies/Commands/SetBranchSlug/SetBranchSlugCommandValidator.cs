using FluentValidation;

namespace RestaurantBill.Application.Features.Companies.Commands.SetBranchSlug;

public class SetBranchSlugCommandValidator : AbstractValidator<SetBranchSlugCommand>
{
    public SetBranchSlugCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz şube.");

        RuleFor(x => x.Slug)
            .NotEmpty().WithMessage("Adres boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Adres en fazla 50 karakter olabilir.");
    }
}
