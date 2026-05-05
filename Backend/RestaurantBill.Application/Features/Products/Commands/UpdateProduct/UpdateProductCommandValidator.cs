using FluentValidation;
namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct;

public class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("Geçersiz bir ürün seçtiniz.");

        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Geçersiz bir kategori seçtiniz.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün ismi boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Ürün adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalıdır.");
    }
}
