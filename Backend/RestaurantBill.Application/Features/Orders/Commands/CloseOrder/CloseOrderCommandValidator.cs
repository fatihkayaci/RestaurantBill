using FluentValidation;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder;

public class CloseOrderCommandValidator : AbstractValidator<DeleteCommand>
{
    public CloseOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");
    }
}
