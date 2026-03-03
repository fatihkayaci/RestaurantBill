using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;

namespace RestaurantBill.Application.Validators.Order;

public class RemoveProductFromOrderCommandValidator : AbstractValidator<RemoveProductFromOrderCommand>
{
    public RemoveProductFromOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.ProductId)
            .GreaterThan(0).WithMessage("Geçerli bir ürün seçilmelidir.");

        RuleFor(x => x.QuantityToRemove)
            .GreaterThan(0).WithMessage("Kaldırılacak miktar 0'dan büyük olmalıdır.");
    }
}
