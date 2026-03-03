using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;

namespace RestaurantBill.Application.Validators.Order;

public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");

        RuleFor(x => x.OrderItems)
            .NotEmpty().WithMessage("Sipariş en az bir ürün içermelidir.");

        RuleForEach(x => x.OrderItems).ChildRules(item =>
        {
            item.RuleFor(x => x.ProductId)
                .GreaterThan(0).WithMessage("Geçerli bir ürün seçilmelidir.");

            item.RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("Ürün miktarı 0'dan büyük olmalıdır.");
        });
    }
}
