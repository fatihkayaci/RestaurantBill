using FluentValidation;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProductImageFocus;

public class UpdateProductImageFocusCommandValidator : AbstractValidator<UpdateProductImageFocusCommand>
{
    public UpdateProductImageFocusCommandValidator()
    {
        RuleFor(x => x.ProductId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz bir ürün seçtiniz.");

        RuleFor(x => x.ImageFocus)
            .IsInEnum().WithMessage("Geçersiz bir görsel konumu seçtiniz.");
    }
}
