using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;

namespace RestaurantBill.Application.Validators.Order;

public class AddProductToOrderCommandValidator : AbstractValidator<AddProductToOrderCommand>
{
    public AddProductToOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not alanı en fazla 500 karakter olabilir.");

        RuleFor(x => x.OrderItems)
            .NotEmpty().WithMessage("Siparişe eklenecek en az bir ürün seçmelisiniz.");

        RuleForEach(x => x.OrderItems)
            .SetValidator(new CreateOrderItemDtoValidator());
    }
}
