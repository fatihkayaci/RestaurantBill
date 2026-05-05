using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;

public class CreateOrderItemDtoValidator : AbstractValidator<CreateOrderItemDto>
{
    public CreateOrderItemDtoValidator()
    {
        RuleFor(x => x.ProductId)
            .GreaterThan(0).WithMessage("Geçerli bir ürün seçilmelidir.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Ürün miktarı 0'dan büyük olmalıdır.");
    }
}
