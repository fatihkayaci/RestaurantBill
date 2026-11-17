using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// Müşteri masadaki QR'dan sipariş gönderir; talep garson onaylayana kadar mutfağa gitmez.
public class CreateOrderRequestCommand : IRequest<Result<OrderRequestStatusDto>>
{
    public Guid TableId { get; set; }
    public List<OrderRequestItemInput> Items { get; set; } = [];
    public string? Note { get; set; }
}

/// <summary>
/// Talep kalemi: ürün (Kind "product", ProductId) ya da menü (Kind "setMenu", SetMenuId + Selections). Paket siparişin
/// sepet satırıyla (CartLineInput) aynı biçim; Kind verilmezse ürün sayılır (eski istemciler).
/// </summary>
public class OrderRequestItemInput
{
    public string Kind { get; set; } = CartLineInput.ProductKind;
    public Guid? ProductId { get; set; }
    public Guid? SetMenuId { get; set; }
    public int Quantity { get; set; }
    public string? Note { get; set; }
    /// <summary>Menü: bölüm → ürün; gönderilmeyen bölümde varsayılan seçenek alınır.</summary>
    public List<CartSelectionInput> Selections { get; set; } = [];

    public bool IsSetMenu => string.Equals(Kind, CartLineInput.SetMenuKind, StringComparison.OrdinalIgnoreCase);

    public CartLineInput ToCartLine() => new()
    {
        Kind = IsSetMenu ? CartLineInput.SetMenuKind : CartLineInput.ProductKind,
        ProductId = IsSetMenu ? null : ProductId,
        SetMenuId = IsSetMenu ? SetMenuId : null,
        Quantity = Quantity,
        Note = Note,
        Selections = IsSetMenu ? Selections ?? [] : []
    };
}

public class CreateOrderRequestCommandValidator : AbstractValidator<CreateOrderRequestCommand>
{
    public CreateOrderRequestCommandValidator()
    {
        RuleFor(x => x.TableId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Sepetiniz boş.")
            .Must(items => items.Count <= OrderRequest.MaxItems).WithMessage($"Bir siparişte en fazla {OrderRequest.MaxItems} kalem olabilir.");
        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .Must(id => id is Guid g && g != Guid.Empty).When(i => !i.IsSetMenu).WithMessage("Geçerli bir ürün seçilmelidir.");
            item.RuleFor(i => i.SetMenuId)
                .Must(id => id is Guid g && g != Guid.Empty).When(i => i.IsSetMenu).WithMessage("Geçerli bir menü seçilmelidir.");
            item.RuleFor(i => i.Selections)
                .Must(s => s is null || s.Count <= 20).WithMessage("Menü seçimi geçersiz.");
            item.RuleFor(i => i.Quantity)
                .InclusiveBetween(1, OrderRequest.MaxQuantity).WithMessage($"Adet 1 ile {OrderRequest.MaxQuantity} arasında olmalı.");
            item.RuleFor(i => i.Note)
                .MaximumLength(300).WithMessage("Ürün notu en fazla 300 karakter olabilir.");
        });
    }
}

public class CreateOrderRequestCommandHandler(
    IAppDbContext db, ITenantResolver tenant, IOrderPricingService pricing, ITableNotificationService tableNotifications)
    : IRequestHandler<CreateOrderRequestCommand, Result<OrderRequestStatusDto>>
{
    public static string OutOfStockMessage(string productName)
        => $"{productName} şu an tükendi. Sepetinizden çıkarıp tekrar gönderin.";

    public async Task<Result<OrderRequestStatusDto>> Handle(CreateOrderRequestCommand request, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<OrderRequestStatusDto>.Failure("Restoran bulunamadı.");

        Table? table = await db.Tables
            .Include(t => t.Region)
            .FirstOrDefaultAsync(t => t.Id == request.TableId && t.Region.Branch.CompanyId == company.Id, cancellationToken);

        if (table is null || table.Status == TableStatus.OutOfService)
            return Result<OrderRequestStatusDto>.Failure("Bu masa bulunamadı. Lütfen garsona haber verin.");

        Guid branchId = table.Region.BranchId;

        QrFeatures features = await CustomerSiteScope.QrFeaturesOfAsync(db, branchId, cancellationToken);
        if (!features.OrderingEnabled)
            return Result<OrderRequestStatusDto>.Failure(CustomerSiteScope.OrderingDisabledMessage);

        int pendingCount = await db.OrderRequests
            .CountAsync(r => r.TableId == table.Id && r.Status == OrderRequestStatus.Pending && r.Kind == OrderRequestKind.TableQr, cancellationToken);
        if (pendingCount >= CustomerSiteScope.MaxPendingOrderRequestsPerTable)
            return Result<OrderRequestStatusDto>.Failure("Bu masadan gönderilen siparişler onay bekliyor. Lütfen garsonun onaylamasını bekleyin.");

        List<OrderRequestItemInput> productItems = request.Items.Where(i => !i.IsSetMenu).ToList();
        List<OrderRequestItemInput> setMenuItems = request.Items.Where(i => i.IsSetMenu).ToList();

        if (productItems.Any(i => i.ProductId is null))
            return Result<OrderRequestStatusDto>.Failure("Geçerli bir ürün seçilmelidir.");

        List<Guid> productIds = productItems.Select(i => i.ProductId!.Value).Distinct().ToList();
        List<Product> products = productIds.Count == 0 ? [] : await db.Products
            .Where(p => productIds.Contains(p.Id) && p.IsActive && p.Category.BranchId == branchId)
            .ToListAsync(cancellationToken);

        if (products.Count != productIds.Count)
            return Result<OrderRequestStatusDto>.Failure("Seçtiğiniz ürünlerden biri artık menüde yok. Sayfayı yenileyip tekrar deneyin.");

        // "Tükendi" ürün masadan da sipariş edilemez (paket siparişte olduğu gibi); garsona hiç düşmez.
        Product? soldOut = products.FirstOrDefault(p => p.IsOutOfStock);
        if (soldOut is not null)
            return Result<OrderRequestStatusDto>.Failure(OutOfStockMessage(soldOut.Name));

        // Menü kalemleri paket sipariş ve garsonun menü eklemesiyle aynı yoldan doğrulanır: şube, aktiflik, zorunlu bölüm
        // seçimi, seçeneğin satışta/tükenmemiş olması. Fiyat saklanmaz; ürünlerde olduğu gibi onayda güncel fiyat yazılır.
        IReadOnlyList<PricedLine> pricedMenus = [];
        if (setMenuItems.Count > 0)
        {
            Result<PricedCart> priced = await pricing.PriceCartAsync(branchId, setMenuItems.Select(i => i.ToCartLine()).ToList(), zone: null, cancellationToken);
            if (priced.IsFailure)
                return Result<OrderRequestStatusDto>.Failure(priced.Error!);
            pricedMenus = priced.Value!.Lines;
        }

        OrderRequest orderRequest = OrderRequest.Create(table.Id, request.Note);
        int menuIndex = 0;
        try
        {
            // Sepetteki sıra korunur.
            foreach (OrderRequestItemInput item in request.Items)
            {
                if (item.IsSetMenu)
                {
                    PricedLine line = pricedMenus[menuIndex++];
                    orderRequest.AddSetMenuItem(line.SetMenu!, line.Quantity, DeliveryScope.SerializeSelections(line.Selections), line.Note);
                }
                else
                {
                    orderRequest.AddItem(products.First(p => p.Id == item.ProductId), item.Quantity, item.Note);
                }
            }
        }
        catch (DomainException ex)
        {
            return Result<OrderRequestStatusDto>.Failure(ex.Message);
        }

        db.OrderRequests.Add(orderRequest);
        await db.SaveChangesAsync(cancellationToken);

        await tableNotifications.SendCustomerRequestsChangedAsync(branchId);

        return Result<OrderRequestStatusDto>.Success(new OrderRequestStatusDto { Id = orderRequest.Id, Status = (int)orderRequest.Status });
    }
}
