using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory
{
    public class CreateCategoryCommand : IRequest<Result>, IInvalidatesCache, IIdempotent
    {
        public required string Name { get; set; }

        public string IdempotencyKey => $"create-category:{Name}";
        public string[] CacheKeysToInvalidate => ["categories:all"];
    }
}