using FluentValidation;
namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct;

public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.CategoryId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz bir kategori seçtiniz.");
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün ismi boş bırakılamaz.")
            .MaximumLength(50).WithMessage("Ürün adı en fazla 50 karakter olabilir.");
        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalıdır.");

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
    }
}
