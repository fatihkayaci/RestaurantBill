using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// Müşteri masadaki QR'dan sipariş gönderir; talep garson onaylayana kadar mutfağa gitmez.
public class CreateOrderRequestCommand : IRequest<Result<OrderRequestStatusDto>>
{
    public Guid TableId { get; set; }
    public List<OrderRequestItemInput> Items { get; set; } = [];
    public string? Note { get; set; }
}

public class OrderRequestItemInput
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public string? Note { get; set; }
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
                .NotEqual(Guid.Empty).WithMessage("Geçerli bir ürün seçilmelidir.");
            item.RuleFor(i => i.Quantity)
                .InclusiveBetween(1, OrderRequest.MaxQuantity).WithMessage($"Adet 1 ile {OrderRequest.MaxQuantity} arasında olmalı.");
            item.RuleFor(i => i.Note)
                .MaximumLength(300).WithMessage("Ürün notu en fazla 300 karakter olabilir.");
        });
    }
}

public class CreateOrderRequestCommandHandler(IAppDbContext db, ITenantResolver tenant, ITableNotificationService tableNotifications)
    : IRequestHandler<CreateOrderRequestCommand, Result<OrderRequestStatusDto>>
{
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

        int pendingCount = await db.OrderRequests
            .CountAsync(r => r.TableId == table.Id && r.Status == OrderRequestStatus.Pending, cancellationToken);
        if (pendingCount >= CustomerSiteScope.MaxPendingOrderRequestsPerTable)
            return Result<OrderRequestStatusDto>.Failure("Bu masadan gönderilen siparişler onay bekliyor. Lütfen garsonun onaylamasını bekleyin.");

        List<Guid> productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        List<Product> products = await db.Products
            .Where(p => productIds.Contains(p.Id) && p.IsActive && p.Category.BranchId == branchId)
            .ToListAsync(cancellationToken);

        if (products.Count != productIds.Count)
            return Result<OrderRequestStatusDto>.Failure("Seçtiğiniz ürünlerden biri artık menüde yok. Sayfayı yenileyip tekrar deneyin.");

        OrderRequest orderRequest = OrderRequest.Create(table.Id, request.Note);
        foreach (OrderRequestItemInput item in request.Items)
            orderRequest.AddItem(products.First(p => p.Id == item.ProductId), item.Quantity, item.Note);

        db.OrderRequests.Add(orderRequest);
        await db.SaveChangesAsync(cancellationToken);

        await tableNotifications.SendCustomerRequestsChangedAsync(branchId);

        return Result<OrderRequestStatusDto>.Success(new OrderRequestStatusDto { Id = orderRequest.Id, Status = (int)orderRequest.Status });
    }
}
