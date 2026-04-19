using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory
{
    public class CreateCategoryCommand : IRequest, IInvalidatesCache, IIdempotent
    {
        public string Name { get; set; } = string.Empty;
        public string IdempotencyKey { get; set; } = string.Empty;

        public string[] CacheKeysToInvalidate => ["categories:all"];
    }
}