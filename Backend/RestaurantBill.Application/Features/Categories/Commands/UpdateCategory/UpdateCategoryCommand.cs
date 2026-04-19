using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.UpdateCategory
{
    public class UpdateCategoryCommand : IRequest, IInvalidatesCache
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public string[] CacheKeysToInvalidate => ["categories:all"];
    }
}