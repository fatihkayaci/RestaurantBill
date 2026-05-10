using FluentValidation;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;

public class UpdateOrderStatusCommandValidator : AbstractValidator<UpdateOrderStatusCommand>
{
    public UpdateOrderStatusCommandValidator()
    {
        RuleFor(x => x.Status)
            .Must(s => Enum.IsDefined(typeof(OrderStatus), s))
            .WithMessage("Geçerli bir sipariş durumu seçilmelidir.");
    }
}
