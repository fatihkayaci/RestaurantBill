using FluentValidation;
namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity;

public class UpdateOrderItemQuantityCommandValidator : AbstractValidator<UpdateOrderItemQuantityCommand>
{
    public UpdateOrderItemQuantityCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .GreaterThan(0).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.ProductId)
            .GreaterThan(0).WithMessage("Geçerli bir ürün seçilmelidir.");
            
        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Miktar 0'dan büyük olmalı!");
    }
}
