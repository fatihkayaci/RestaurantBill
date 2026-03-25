using FluentValidation;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Validators.Product;

public class UpdateProductDtoValidator : AbstractValidator<UpdateProductDto>
{
    public UpdateProductDtoValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("Geçersiz bir ürün seçtiniz.");
        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Geçersiz bir kategori seçtiniz.");
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("ürün isim kısmı boş bırakılamaz.")
            .MaximumLength(50).WithMessage("ürün adı en fazla 50 karakter olabilir.");
        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Fiyat 0 veya daha büyük olmalıdır.");
    }
}