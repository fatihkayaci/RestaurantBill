using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.MoveOrderToTable;

namespace RestaurantBill.Application.Validators.Order;

public class MoveOrderToTableCommandValidator : AbstractValidator<MoveOrderToTableCommand>
{
    public MoveOrderToTableCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}
