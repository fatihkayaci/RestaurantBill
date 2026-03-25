using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;

namespace RestaurantBill.Application.Validators.Order;

public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");

    }
}
