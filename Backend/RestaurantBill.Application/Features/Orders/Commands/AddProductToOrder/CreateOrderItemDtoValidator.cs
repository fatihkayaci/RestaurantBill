using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;

public class CreateOrderItemDtoValidator : AbstractValidator<CreateOrderItemDto>
{
    public CreateOrderItemDtoValidator()
    {
        RuleFor(x => x.ProductId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir ürün seçilmelidir.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Ürün miktarı 0'dan büyük olmalıdır.");

        RuleFor(x => x.Note)
            .MaximumLength(300).WithMessage("Ürün notu en fazla 300 karakter olabilir.");
    }
}
