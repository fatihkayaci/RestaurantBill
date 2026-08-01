using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable
{
    public class CreateTableCommand : IRequest<Result>, IInvalidatesCache
    {
        public string Name { get; set; } = string.Empty;
        public Guid RegionId { get; set; }

        public string[] CacheKeysToInvalidate => new[] { "tables:all" };
    }
}