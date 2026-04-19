using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.DeleteCategory
{
    public class DeleteCategoryCommand : IRequest, IInvalidatesCache
    {
        public int Id { get; set; }

        public string[] CacheKeysToInvalidate => ["categories:all"];
    }
}