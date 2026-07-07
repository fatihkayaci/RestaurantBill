using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable
{
    public class CreateTableCommand : IRequest, IInvalidatesCache
    {
        public string Name { get; set; } = string.Empty;
        public int? RegionId { get; set; }

        public string[] CacheKeysToInvalidate => new[] { "tables:all" };
    }
}