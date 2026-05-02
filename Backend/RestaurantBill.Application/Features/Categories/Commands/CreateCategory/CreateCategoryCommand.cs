using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory
{
    public class CreateCategoryCommand : IRequest, IInvalidatesCache, IIdempotent
    {
        public required string Name { get; set; }

        public string IdempotencyKey { get; set; } = string.Empty;
        public string[] CacheKeysToInvalidate => ["categories:all"];
    }
}