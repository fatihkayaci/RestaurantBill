using FluentValidation;
namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity;

public class UpdateOrderItemQuantityCommandValidator : AbstractValidator<UpdateOrderItemQuantityCommand>
{
    public UpdateOrderItemQuantityCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.ProductId)
            .NotEqual(Guid.Empty).When(x => x.OrderItemId is null).WithMessage("Geçerli bir ürün seçilmelidir.");

        RuleFor(x => x.OrderItemId)
            .NotEqual(Guid.Empty).When(x => x.OrderItemId is not null).WithMessage("Geçerli bir sipariş kalemi seçilmelidir.");
            
        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Miktar 0'dan büyük olmalı!");
    }
}
