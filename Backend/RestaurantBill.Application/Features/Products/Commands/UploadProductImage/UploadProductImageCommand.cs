using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.UploadProductImage
{
    public class UploadProductImageCommand : IRequest<Result<string>>, IInvalidatesCache
    {
        public Guid ProductId { get; set; }
        public Stream Content { get; set; } = Stream.Null;
        public string ContentType { get; set; } = string.Empty;
        public long Length { get; set; }

        public string[] CacheKeysToInvalidate => ["products:all"];
    }
}
