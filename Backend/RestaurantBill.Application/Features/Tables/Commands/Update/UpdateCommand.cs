using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.Update
{
    public class UpdateCommand : IRequest, IInvalidatesCache
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public string[] CacheKeysToInvalidate => ["tables:all"];
    }
}