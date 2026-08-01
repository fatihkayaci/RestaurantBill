using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.DeleteTable
{
    public class DeleteTableCommand : IRequest<Result>, IInvalidatesCache
    {
        public Guid TableId { get; set; }

        public string[] CacheKeysToInvalidate => ["tables:all"];
    }
}