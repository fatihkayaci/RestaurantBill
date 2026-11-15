using FluentValidation;
using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.SetProductStockImage
{
    /// <summary>
    /// Ürünün görselini hazır görsel kütüphanesinden seçer: ürün yalnızca paylaşılan anahtarı saklar, dosya kopyalanmaz
    /// ya da yüklenmez. Dönen değer görselin tam CDN adresi.
    /// </summary>
    public class SetProductStockImageCommand : IRequest<Result<string>>, IInvalidatesCache
    {
        public Guid ProductId { get; set; }
        public Guid StockImageId { get; set; }

        public string[] CacheKeysToInvalidate => ["products:all"];
    }

    public class SetProductStockImageCommandValidator : AbstractValidator<SetProductStockImageCommand>
    {
        public SetProductStockImageCommandValidator()
        {
            RuleFor(x => x.ProductId).NotEqual(Guid.Empty).WithMessage("Geçersiz bir ürün seçtiniz.");
            RuleFor(x => x.StockImageId).NotEqual(Guid.Empty).WithMessage("Geçersiz bir görsel seçtiniz.");
        }
    }
}
