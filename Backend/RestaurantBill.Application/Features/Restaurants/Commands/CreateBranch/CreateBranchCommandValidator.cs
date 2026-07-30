using FluentValidation;

namespace RestaurantBill.Application.Features.Restaurants.Commands.CreateBranch;

public class CreateBranchCommandValidator : AbstractValidator<CreateBranchCommand>
{
    public CreateBranchCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Şube adı boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Şube adı en fazla 100 karakter olabilir.");
    }
}
