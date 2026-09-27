using FluentValidation;

namespace RestaurantBill.Application.Features.Restaurants.Commands.DeleteBranch;

public class DeleteBranchCommandValidator : AbstractValidator<DeleteBranchCommand>
{
    public DeleteBranchCommandValidator()
    {
        RuleFor(x => x.BranchId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz şube.");
    }
}
