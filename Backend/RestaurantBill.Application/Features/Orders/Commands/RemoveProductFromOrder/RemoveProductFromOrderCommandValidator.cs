using FluentValidation;
namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;

public class RemoveProductFromOrderCommandValidator : AbstractValidator<RemoveProductFromOrderCommand>
{
    public RemoveProductFromOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.ProductId)
            .NotEqual(Guid.Empty).When(x => x.OrderItemId is null).WithMessage("Geçerli bir ürün seçilmelidir.");

        RuleFor(x => x.OrderItemId)
            .NotEqual(Guid.Empty).When(x => x.OrderItemId is not null).WithMessage("Geçerli bir sipariş kalemi seçilmelidir.");

    }
}
