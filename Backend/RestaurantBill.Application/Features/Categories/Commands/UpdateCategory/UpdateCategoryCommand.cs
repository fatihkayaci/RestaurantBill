using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.UpdateCategory
{
    public class UpdateCategoryCommand : IRequest<Result>, IInvalidatesCache
    {
        public int Id { get; set; }
        public required string Name { get; set; }

        public string[] CacheKeysToInvalidate => ["categories:all"];
    }
}