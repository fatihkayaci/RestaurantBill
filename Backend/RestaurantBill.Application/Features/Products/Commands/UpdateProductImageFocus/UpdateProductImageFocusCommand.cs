using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProductImageFocus
{
    public class UpdateProductImageFocusCommand : IRequest<Result>, IInvalidatesCache
    {
        public Guid ProductId { get; set; }
        public ImageFocus ImageFocus { get; set; }

        public string[] CacheKeysToInvalidate => ["products:all"];
    }
}
