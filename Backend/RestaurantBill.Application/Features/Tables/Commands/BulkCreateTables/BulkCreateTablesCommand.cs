using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.BulkCreateTables
{
    // Ön ek + sıra numarasıyla tek seferde birden çok masa açar: "Masa" + 1..20 → "Masa 1" … "Masa 20".
    public class BulkCreateTablesCommand : IRequest<Result<BulkCreateTablesResultDto>>, IInvalidatesCache
    {
        public const int MaxCount = 100;

        public Guid RegionId { get; set; }
        public string Prefix { get; set; } = "Masa";
        public int StartNumber { get; set; } = 1;
        public int Count { get; set; }

        public string[] CacheKeysToInvalidate => new[] { "tables:all" };

        // Ön ek boşsa masa adı yalnızca numaradır ("1", "2" …).
        public IEnumerable<string> BuildNames()
        {
            string prefix = Prefix.Trim();
            return Enumerable.Range(StartNumber, Count)
                .Select(number => prefix.Length == 0 ? number.ToString() : $"{prefix} {number}");
        }
    }
}
