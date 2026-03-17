using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Validators.OrderItem;

public class CreateOrderItemDtoValidator : AbstractValidator<CreateOrderItemDto>
{
    public CreateOrderItemDtoValidator()
    {
        // RuleFor(x => x.OrderId)
        //     .GreaterThan(0).WithMessage("Geçersiz bir sipariş seçtiniz.");
        RuleFor(x => x.ProductId)
            .GreaterThan(0).WithMessage("Geçersiz bir ürün seçtiniz.");
        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Adet 0 dan büyük olmalıdır.");
    }
}