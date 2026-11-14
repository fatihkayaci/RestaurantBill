using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Common;

/// <summary>
/// Online sepetin tek fiyatlandırma yolu. İstemci yalnızca Id, adet ve menü seçimlerini gönderir; birim fiyat, KDV,
/// teslimat ücreti ve toplam burada hesaplanır. Teklif (quote) ve sipariş gönderimi aynı sonucu kullanır.
/// </summary>
public interface IOrderPricingService
{
    /// <param name="zone">Verilirse teslimat ücreti ve en az sipariş tutarı uygulanır.</param>
    Task<Result<PricedCart>> PriceCartAsync(Guid branchId, IReadOnlyList<CartLineInput> lines, DeliveryZone? zone, CancellationToken cancellationToken);
}

public sealed class PricedCart
{
    public required IReadOnlyList<PricedLine> Lines { get; init; }
    public required decimal Subtotal { get; init; }
    public required decimal DeliveryFee { get; init; }
    public decimal Total => Subtotal + DeliveryFee;
    public DeliveryZone? Zone { get; init; }

    public bool MeetsMinimum => Zone is null || Subtotal >= Zone.MinOrderAmount;
    public decimal AmountToMinimum => Zone is null ? 0m : Math.Max(0m, Zone.MinOrderAmount - Subtotal);

    public DeliveryQuoteDto ToQuoteDto() => new()
    {
        Lines = Lines.Select(l => new DeliveryQuoteLineDto
        {
            Kind = l.SetMenu is null ? CartLineInput.ProductKind : CartLineInput.SetMenuKind,
            ProductId = l.Product?.Id,
            SetMenuId = l.SetMenu?.Id,
            Name = l.Name,
            Selections = l.SelectionNames.ToList(),
            UnitPrice = l.UnitPrice,
            Quantity = l.Quantity,
            LineTotal = l.UnitPrice * l.Quantity,
            Note = l.Note
        }).ToList(),
        Subtotal = Subtotal,
        DeliveryFee = DeliveryFee,
        Total = Total,
        ZoneId = Zone?.Id,
        ZoneName = Zone?.Name ?? string.Empty,
        MinOrderAmount = Zone?.MinOrderAmount ?? 0m,
        MeetsMinimum = MeetsMinimum,
        AmountToMinimum = AmountToMinimum,
        EstimatedMinutes = Zone?.EstimatedMinutes ?? 0
    };
}

public sealed class PricedLine
{
    public Product? Product { get; init; }
    public SetMenu? SetMenu { get; init; }
    /// <summary>Menüde her bölüm için çözülmüş seçim (varsayılanlar dahil): bölüm Id → ürün Id.</summary>
    public IReadOnlyDictionary<Guid, Guid> Selections { get; init; } = new Dictionary<Guid, Guid>();
    public IReadOnlyList<string> SelectionNames { get; init; } = [];
    public required string Name { get; init; }
    public required decimal UnitPrice { get; init; }
    public required decimal TaxRate { get; init; }
    public required int Quantity { get; init; }
    public string Note { get; init; } = string.Empty;
}

public class OrderPricingService(IAppDbContext db) : IOrderPricingService
{
    public const string ProductUnavailableMessage = "Sepetinizdeki ürünlerden biri artık menüde yok. Sayfayı yenileyip tekrar deneyin.";

    public async Task<Result<PricedCart>> PriceCartAsync(Guid branchId, IReadOnlyList<CartLineInput> lines, DeliveryZone? zone, CancellationToken cancellationToken)
    {
        if (lines is null || lines.Count == 0)
            return Result<PricedCart>.Failure("Sepetiniz boş.");
        if (lines.Count > DeliveryOrder.MaxLines)
            return Result<PricedCart>.Failure($"Bir siparişte en fazla {DeliveryOrder.MaxLines} kalem olabilir.");
        if (lines.Any(l => l.Quantity < 1 || l.Quantity > DeliveryOrder.MaxQuantity))
            return Result<PricedCart>.Failure($"Adet 1 ile {DeliveryOrder.MaxQuantity} arasında olmalı.");
        if (lines.Any(l => (l.Note?.Trim().Length ?? 0) > DeliveryOrderLine.NoteMaxLength))
            return Result<PricedCart>.Failure($"Ürün notu en fazla {DeliveryOrderLine.NoteMaxLength} karakter olabilir.");
        if (zone is not null && zone.BranchId != branchId)
            return Result<PricedCart>.Failure("Geçersiz teslimat bölgesi.");

        List<Guid> productIds = lines.Where(l => !l.IsSetMenu && l.ProductId is not null).Select(l => l.ProductId!.Value).Distinct().ToList();
        List<Guid> setMenuIds = lines.Where(l => l.IsSetMenu && l.SetMenuId is not null).Select(l => l.SetMenuId!.Value).Distinct().ToList();

        Dictionary<Guid, Product> products = productIds.Count == 0 ? [] : await db.Products
            .Include(p => p.Category).ThenInclude(c => c.Branch)
            .Where(p => productIds.Contains(p.Id) && p.Category.BranchId == branchId && !p.IsDeleted)
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        Dictionary<Guid, SetMenu> setMenus = setMenuIds.Count == 0 ? [] : await db.SetMenus
            .Include(s => s.Branch)
            .Include(s => s.Category)
            .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
            .Where(s => setMenuIds.Contains(s.Id) && s.BranchId == branchId && !s.IsDeleted)
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        var priced = new List<PricedLine>(lines.Count);
        foreach (CartLineInput line in lines)
        {
            Result<PricedLine> result = line.IsSetMenu ? PriceSetMenu(line, setMenus) : PriceProduct(line, products);
            if (result.IsFailure)
                return Result<PricedCart>.Failure(result.Error!);
            priced.Add(result.Value!);
        }

        decimal subtotal = priced.Sum(l => l.UnitPrice * l.Quantity);
        decimal fee = zone?.Fee ?? 0m;
        if (subtotal + fee > DeliveryOrder.MaxTotal)
            return Result<PricedCart>.Failure($"Online sipariş tutarı en fazla ₺{DeliveryOrder.MaxTotal:0} olabilir.");

        return Result<PricedCart>.Success(new PricedCart { Lines = priced, Subtotal = subtotal, DeliveryFee = fee, Zone = zone });
    }

    private static Result<PricedLine> PriceProduct(CartLineInput line, IReadOnlyDictionary<Guid, Product> products)
    {
        if (line.ProductId is not Guid productId || !products.TryGetValue(productId, out Product? product) || !product.IsActive)
            return Result<PricedLine>.Failure(ProductUnavailableMessage);
        if (product.IsOutOfStock)
            return Result<PricedLine>.Failure($"{product.Name} şu an tükendi. Sepetinizden çıkarıp tekrar deneyin.");

        return Result<PricedLine>.Success(new PricedLine
        {
            Product = product,
            Name = product.Name,
            UnitPrice = product.Price,
            TaxRate = product.GetEffectiveTaxRate(),
            Quantity = line.Quantity,
            Note = line.Note?.Trim() ?? string.Empty
        });
    }

    private static Result<PricedLine> PriceSetMenu(CartLineInput line, IReadOnlyDictionary<Guid, SetMenu> setMenus)
    {
        if (line.SetMenuId is not Guid setMenuId || !setMenus.TryGetValue(setMenuId, out SetMenu? setMenu) || !setMenu.IsActive)
            return Result<PricedLine>.Failure(ProductUnavailableMessage);

        List<CartSelectionInput> selections = line.Selections ?? [];
        if (selections.Select(s => s.SlotId).Distinct().Count() != selections.Count)
            return Result<PricedLine>.Failure($"{setMenu.Name}: aynı bölüm için iki seçim gönderilmiş.");

        IReadOnlyList<SetMenuSlotOption> chosen;
        try
        {
            chosen = setMenu.ResolveSelections(selections.ToDictionary(s => s.SlotId, s => s.ProductId));
        }
        catch (DomainException ex)
        {
            return Result<PricedLine>.Failure(ex.Message);
        }

        SetMenuSlotOption? unavailable = chosen.FirstOrDefault(o => !o.Product.IsActive || o.Product.IsOutOfStock || o.Product.IsDeleted);
        if (unavailable is not null)
            return Result<PricedLine>.Failure($"{unavailable.Product.Name} şu an yok, {setMenu.Name} için başka bir seçim yapın.");

        // Kabulde siparişe aynı seçimler yazılsın diye varsayılanlar dahil tüm bölümlerin seçimi saklanır.
        Dictionary<Guid, Guid> resolved = chosen.ToDictionary(o => o.SetMenuSlotId, o => o.ProductId);

        return Result<PricedLine>.Success(new PricedLine
        {
            SetMenu = setMenu,
            Selections = resolved,
            SelectionNames = chosen.Select(o => o.Surcharge > 0 ? $"{o.Product.Name} (+₺{o.Surcharge:0.##})" : o.Product.Name).ToList(),
            Name = setMenu.Name,
            UnitPrice = setMenu.Price + chosen.Sum(o => o.Surcharge),
            // Garsonun menü eklemesiyle aynı: menünün gösterim kategorisinin oranı, yoksa şubenin oranı.
            TaxRate = setMenu.Category?.TaxRate ?? setMenu.Branch.TaxRate,
            Quantity = line.Quantity,
            Note = line.Note?.Trim() ?? string.Empty
        });
    }
}
