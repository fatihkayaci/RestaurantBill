using FluentValidation;
namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct;

public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Geçersiz bir kategori seçtiniz.");
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün ismi boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Ürün adı en fazla 50 karakter olabilir.");
        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalıdır.");
    }
}
