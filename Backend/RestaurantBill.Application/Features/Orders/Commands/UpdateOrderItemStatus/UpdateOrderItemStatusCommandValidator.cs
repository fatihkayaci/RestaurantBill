using FluentValidation;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus;

public class UpdateOrderItemStatusCommandValidator : AbstractValidator<UpdateOrderItemStatusCommand>
{
    public UpdateOrderItemStatusCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.OrderItemId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş kalemi seçilmelidir.");

        RuleFor(x => x.Status)
            .IsInEnum().WithMessage("Geçerli bir durum seçilmelidir.");
    }
}
