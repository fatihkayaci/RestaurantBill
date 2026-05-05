using FluentValidation;
namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrder;

public class CancelOrderCommandValidator : AbstractValidator<CancelOrderCommand>
{
    public CancelOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");
    }
}
