using FluentValidation;
namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct;

public class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz bir ürün seçtiniz.");

        RuleFor(x => x.CategoryId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz bir kategori seçtiniz.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün ismi boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Ürün adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalıdır.");

        RuleFor(x => x.Cost)
            .GreaterThanOrEqualTo(0).WithMessage("Maliyet 0'dan küçük olamaz.")
            .When(x => x.Cost.HasValue);

        RuleFor(x => x.Description)
            .MaximumLength(RestaurantBill.Domain.Entities.Product.DescriptionMaxLength)
            .WithMessage($"Ürün açıklaması en fazla {RestaurantBill.Domain.Entities.Product.DescriptionMaxLength} karakter olabilir.");

        RuleFor(x => x.PrepMinutes)
            .InclusiveBetween(1, RestaurantBill.Domain.Entities.Product.PrepMinutesMax)
            .WithMessage($"Hazırlanma süresi 1 ile {RestaurantBill.Domain.Entities.Product.PrepMinutesMax} dakika arasında olmalıdır.")
            .When(x => x.PrepMinutes.HasValue);

        RuleFor(x => x.TaxRate)
            .InclusiveBetween(0, 100).WithMessage("KDV oranı 0 ile 100 arasında olmalıdır.")
            .When(x => x.TaxRate.HasValue);

        RuleFor(x => x.Allergens)
            .Must(a => a is null || (a >= 0 && (a & ~RestaurantBill.Domain.Enums.ProductAllergens.All) == 0))
            .WithMessage("Geçersiz alerjen seçimi.");

        RuleFor(x => x.DietTags)
            .Must(d => d is null || (d >= 0 && (d & ~RestaurantBill.Domain.Enums.ProductDietTags.All) == 0))
            .WithMessage("Geçersiz diyet etiketi.");
    }
}
