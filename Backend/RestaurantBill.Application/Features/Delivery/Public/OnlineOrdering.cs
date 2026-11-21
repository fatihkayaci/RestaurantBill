using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.SetMenus;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Public;

// Girişsiz uçların ortak çözümü: restoran slug'dan, şube sorgudan (yoksa online siparişi açık en eski şube).
internal static class PublicDeliveryContext
{
    public static async Task<(Company? Company, Branch? Branch, List<Branch> EnabledBranches)> ResolveAsync(
        IAppDbContext db, ITenantResolver tenant, Guid? branchId, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return (null, null, []);

        var (branch, enabled) = await DeliveryScope.ResolveBranchAsync(db, company.Id, branchId, cancellationToken);
        return (company, branch, enabled);
    }

    public static bool RequiresPhoneVerification(OnlineOrderSettings settings, ISmsSender sms)
        => settings.RequirePhoneVerification && sms.IsConfigured;
}

// ── Online sipariş sayfası: durum, bölgeler, ödeme yöntemleri, menü, şube seçici ─────────────────
public class GetOnlineOrderingQuery : IRequest<Result<OnlineOrderingDto>>
{
    public Guid? BranchId { get; set; }
}

public class GetOnlineOrderingQueryHandler(
    IAppDbContext db, ITenantResolver tenant, IOptions<BunnyStorageOptions> storageOptions, ISmsSender sms, TimeProvider clock)
    : IRequestHandler<GetOnlineOrderingQuery, Result<OnlineOrderingDto>>
{
    public async Task<Result<OnlineOrderingDto>> Handle(GetOnlineOrderingQuery request, CancellationToken cancellationToken)
    {
        var (company, branch, enabledBranches) = await PublicDeliveryContext.ResolveAsync(db, tenant, request.BranchId, cancellationToken);
        if (company is null || branch is null)
            return Result<OnlineOrderingDto>.Failure(DeliveryScope.RestaurantNotFoundMessage);

        OnlineOrderSettings settings = branch.GetOnlineOrderSettings();
        DeliveryScope.Availability availability = DeliveryScope.AvailabilityOf(branch, clock.GetUtcNow().UtcDateTime);
        string cdnBaseUrl = storageOptions.Value.CdnBaseUrl.TrimEnd('/');

        var dto = new OnlineOrderingDto
        {
            BranchId = branch.Id,
            BranchName = branch.BranchName,
            RestaurantPhone = branch.Number,
            State = availability.State,
            IsOpen = availability.IsOpen,
            Message = availability.Message,
            NextOpensAt = availability.NextOpensAt,
            LastOrderAt = availability.LastOrderAt,
            PaymentMethods = DeliveryScope.PaymentMethodsOf(branch),
            IbanPayment = branch.AcceptsIbanForDelivery ? TableIbanPaymentDto.ForPayment(branch) : null,
            RequiresPhoneVerification = PublicDeliveryContext.RequiresPhoneVerification(settings, sms),
            PickupEnabled = branch.OffersPickup,
            PickupEtaMinutes = settings.PickupEtaMinutes,
            PickupAddress = branch.OffersPickup ? DeliveryScope.PickupAddressOf(branch) : string.Empty,
            PickupDirections = branch.OffersPickup ? branch.GetSiteContent().DirectionsNote : string.Empty,
            Branches = enabledBranches.Select(b => new OnlineBranchDto { Id = b.Id, Name = b.BranchName, District = b.District }).ToList()
        };

        // Kapalı (ayarda) şubenin menüsü ve bölgeleri gösterilmez; durdurulmuş ya da saat dışı şubenin menüsü görünür.
        if (!settings.Enabled)
            return Result<OnlineOrderingDto>.Success(dto);

        dto.Zones = await db.DeliveryZones.AsNoTracking()
            .Where(z => z.BranchId == branch.Id && z.IsActive && !z.IsDeleted)
            .OrderBy(z => z.SortOrder).ThenBy(z => z.Name)
            .Select(z => new DeliveryZoneDto
            {
                Id = z.Id,
                Name = z.Name,
                Fee = z.Fee,
                MinOrderAmount = z.MinOrderAmount,
                EstimatedMinutes = z.EstimatedMinutes,
                IsActive = z.IsActive,
                SortOrder = z.SortOrder
            })
            .ToListAsync(cancellationToken);

        List<OnlineMenuCategoryDto> categories = await db.Categories.AsNoTracking()
            .Where(c => c.BranchId == branch.Id && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new OnlineMenuCategoryDto { Id = c.Id, Name = c.Name })
            .ToListAsync(cancellationToken);

        var products = await db.Products.AsNoTracking()
            .Where(p => p.Category.BranchId == branch.Id && p.IsActive && !p.IsDeleted)
            .OrderBy(p => p.Name)
            .Select(p => new { p.Id, p.Name, p.Price, p.ImageUrl, p.CategoryId, p.Description, p.IsFeatured, p.IsOutOfStock })
            .ToListAsync(cancellationToken);

        foreach (OnlineMenuCategoryDto category in categories)
        {
            category.Products = products
                .Where(p => p.CategoryId == category.Id)
                .Select(p => new OnlineMenuProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = p.Price,
                    ImageUrl = ImageUrl(cdnBaseUrl, p.ImageUrl),
                    IsStockImage = StorageKeys.IsShared(p.ImageUrl),
                    Description = p.Description,
                    IsFeatured = p.IsFeatured,
                    IsOutOfStock = p.IsOutOfStock
                })
                .ToList();
        }
        dto.Categories = categories.Where(c => c.Products.Count > 0).ToList();

        dto.SetMenus = await PublicSetMenus.LoadAsync(db, branch.Id, cdnBaseUrl, listedOnly: false, cancellationToken);

        return Result<OnlineOrderingDto>.Success(dto);
    }

    private static string ImageUrl(string cdnBaseUrl, string key)
        => string.IsNullOrWhiteSpace(key) ? string.Empty : $"{cdnBaseUrl}/{key}";
}

// ── Sepet teklifi: fiyatlar, teslimat ücreti, en az tutar ──────────────────────────────────────────
public class QuoteDeliveryOrderCommand : IRequest<Result<DeliveryQuoteDto>>
{
    public Guid? BranchId { get; set; }
    /// <summary>Mahalle seçilmeden de istenebilir; o zaman ücret ve en az tutar uygulanmaz.</summary>
    public Guid? ZoneId { get; set; }
    /// <summary>Gel al: bölge yok sayılır, teslimat ücreti ve en az tutar uygulanmaz; süre gel al hazır olma süresidir.</summary>
    public bool Pickup { get; set; }
    public List<CartLineInput> Lines { get; set; } = [];
}

public class QuoteDeliveryOrderCommandValidator : AbstractValidator<QuoteDeliveryOrderCommand>
{
    public QuoteDeliveryOrderCommandValidator()
    {
        RuleFor(x => x.Lines).CartRules();
    }
}

public class QuoteDeliveryOrderCommandHandler(IAppDbContext db, ITenantResolver tenant, IOrderPricingService pricing)
    : IRequestHandler<QuoteDeliveryOrderCommand, Result<DeliveryQuoteDto>>
{
    public async Task<Result<DeliveryQuoteDto>> Handle(QuoteDeliveryOrderCommand request, CancellationToken cancellationToken)
    {
        var (company, branch, _) = await PublicDeliveryContext.ResolveAsync(db, tenant, request.BranchId, cancellationToken);
        if (company is null || branch is null)
            return Result<DeliveryQuoteDto>.Failure(DeliveryScope.RestaurantNotFoundMessage);
        if (!branch.GetOnlineOrderSettings().Enabled)
            return Result<DeliveryQuoteDto>.Failure(DeliveryScope.DisabledMessage);
        if (request.Pickup && !branch.OffersPickup)
            return Result<DeliveryQuoteDto>.Failure(DeliveryScope.PickupDisabledMessage);

        DeliveryZone? zone = null;
        if (!request.Pickup && request.ZoneId is Guid zoneId)
        {
            zone = await db.DeliveryZones.AsNoTracking()
                .FirstOrDefaultAsync(z => z.Id == zoneId && z.BranchId == branch.Id && z.IsActive && !z.IsDeleted, cancellationToken);
            if (zone is null)
                return Result<DeliveryQuoteDto>.Failure(DeliveryPublicMessages.ZoneUnavailable);
        }

        Result<PricedCart> priced = await pricing.PriceCartAsync(branch.Id, request.Lines, zone, cancellationToken);
        if (priced.IsFailure)
            return Result<DeliveryQuoteDto>.Failure(priced.Error!);

        DeliveryQuoteDto quote = priced.Value!.ToQuoteDto();
        if (request.Pickup)
            quote.EstimatedMinutes = branch.GetOnlineOrderSettings().PickupEtaMinutes;
        return Result<DeliveryQuoteDto>.Success(quote);
    }
}

public static class DeliveryPublicMessages
{
    public const string ZoneUnavailable = "Seçtiğiniz bölgeye şu an teslimat yapılmıyor. Listeden başka bir bölge seçin.";
}

public static class CartValidationRules
{
    // Fiyatlandırma da aynı sınırları uygular; burada istek erkenden ve tek mesajla reddedilir.
    public static IRuleBuilderOptions<T, List<CartLineInput>> CartRules<T>(this IRuleBuilderInitial<T, List<CartLineInput>> rule)
        => rule
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Sepetiniz boş.")
            .Must(lines => lines.Count <= DeliveryOrder.MaxLines).WithMessage($"Bir siparişte en fazla {DeliveryOrder.MaxLines} kalem olabilir.")
            .Must(lines => lines.All(l => l.Quantity >= 1 && l.Quantity <= DeliveryOrder.MaxQuantity))
                .WithMessage($"Adet 1 ile {DeliveryOrder.MaxQuantity} arasında olmalı.")
            .Must(lines => lines.All(l => string.Equals(l.Kind, CartLineInput.ProductKind, StringComparison.OrdinalIgnoreCase)
                    ? l.ProductId is Guid p && p != Guid.Empty
                    : string.Equals(l.Kind, CartLineInput.SetMenuKind, StringComparison.OrdinalIgnoreCase) && l.SetMenuId is Guid m && m != Guid.Empty))
                .WithMessage("Sepetteki bir satır geçersiz. Sayfayı yenileyip tekrar deneyin.")
            .Must(lines => lines.All(l => (l.Note?.Length ?? 0) <= DeliveryOrderLine.NoteMaxLength))
                .WithMessage($"Ürün notu en fazla {DeliveryOrderLine.NoteMaxLength} karakter olabilir.")
            .Must(lines => lines.All(l => l.Selections is null || l.Selections.Count <= 20))
                .WithMessage("Sepetteki bir menü geçersiz. Sayfayı yenileyip tekrar deneyin.");
}
