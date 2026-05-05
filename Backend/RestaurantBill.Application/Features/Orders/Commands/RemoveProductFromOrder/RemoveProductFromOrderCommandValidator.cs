using FluentValidation;
namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;

public class RemoveProductFromOrderCommandValidator : AbstractValidator<RemoveProductFromOrderCommand>
{
    public RemoveProductFromOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.ProductId)
            .GreaterThan(0).WithMessage("Geçerli bir ürün seçilmelidir.");

    }
}
