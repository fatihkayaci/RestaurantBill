using FluentValidation;
namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder;

public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");

    }
}
