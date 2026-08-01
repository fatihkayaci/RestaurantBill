using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.UpdateTable
{
    public class UpdateTableCommand : IRequest<Result>, IInvalidatesCache
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public TableStatus? Status { get; set; }
        public Guid RegionId { get; set; }

        public string[] CacheKeysToInvalidate => ["tables:all"];
    }
}