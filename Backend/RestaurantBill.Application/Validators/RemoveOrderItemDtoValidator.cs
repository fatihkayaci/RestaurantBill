using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Validators;

public class RemoveOrderItemDtoValidator : AbstractValidator<RemoveOrderItemDto>
{
    public RemoveOrderItemDtoValidator()
    {
        RuleFor(x => x.ProductId)
            .GreaterThan(0).WithMessage("Geçersiz bir ürün seçtiniz.");

        RuleFor(x => x.QuantityToRemove)
            .GreaterThan(0).WithMessage("İptal edilecek miktar 0'dan büyük olmalıdır.");
    }
}