using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Tables.Commands.UpdateTable
{
    public class UpdateTableCommand : IRequest, IInvalidatesCache
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public TableStatus? Status { get; set; }

        public string[] CacheKeysToInvalidate => ["tables:all"];
    }
}