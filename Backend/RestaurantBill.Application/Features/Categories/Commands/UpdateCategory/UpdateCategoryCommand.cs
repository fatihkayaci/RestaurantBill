using MediatR;
using RestaurantBill.Application.Features.Categories;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.UpdateCategory
{
    public class UpdateCategoryCommand : IRequest<Result>, IInvalidatesCache
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public decimal? TaxRate { get; set; }
        /// <summary>Müşteri menüsündeki görünüm; null (eski istemci göndermez): değiştirme.</summary>
        public CategoryMenuDisplay? MenuDisplay { get; set; }
        /// <summary>Servis penceresi; null (eski istemci göndermez): değiştirme. "Her zaman" için alanları boş nesne gönderilir.</summary>
        public CategoryAvailabilityInput? Availability { get; set; }

        public string[] CacheKeysToInvalidate => ["categories:all"];
    }
}