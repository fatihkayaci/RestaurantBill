using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Validators.OrderItem;

public class UpdateOrderItemDtoValidator : AbstractValidator<UpdateOrderItemDto>
{
    public UpdateOrderItemDtoValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("Geçersiz bir ürün seçtiniz.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Adet 0'dan büyük olmalıdır.");
    }
}