using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.Delete
{
    public class DeleteCommand : IRequest, IInvalidatesCache
    {
        public int TableId { get; set; }

        public string[] CacheKeysToInvalidate => ["tables:all"];
    }
}