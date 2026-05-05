using FluentValidation;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder;

public class CloseOrderCommandValidator : AbstractValidator<DeleteCommand>
{
    public CloseOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");
    }
}
