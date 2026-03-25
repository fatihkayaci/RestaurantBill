using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;

namespace RestaurantBill.Application.Validators.Order;

public class AddProductToOrderCommandValidator : AbstractValidator<AddProductToOrderCommand>
{
    public AddProductToOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş seçilmelidir.");

        // RuleFor(x => x.ProductId)
        //     .GreaterThan(0).WithMessage("Geçerli bir ürün seçilmelidir.");

        // RuleFor(x => x.Quantity)
        //     .GreaterThan(0).WithMessage("Ürün miktarı 0'dan büyük olmalıdır.");
    }
}
