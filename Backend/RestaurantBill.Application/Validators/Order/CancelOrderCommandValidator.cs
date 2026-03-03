using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;

namespace RestaurantBill.Application.Validators.Order;

public class CancelOrderCommandValidator : AbstractValidator<CancelOrderCommand>
{
    public CancelOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş seçilmelidir.");
    }
}
