using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.DeleteTable
{
    public class DeleteTableCommand : IRequest, IInvalidatesCache
    {
        public int TableId { get; set; }

        public string[] CacheKeysToInvalidate => ["tables:all"];
    }
}