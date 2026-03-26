using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;

namespace RestaurantBill.Application.Validators.Order;

public class CloseOrderCommandValidator : AbstractValidator<CloseOrderCommand>
{
    public CloseOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");
    }
}
