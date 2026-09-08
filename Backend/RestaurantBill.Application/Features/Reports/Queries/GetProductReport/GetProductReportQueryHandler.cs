using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Reports.Queries.GetProductReport;

public class GetProductReportQueryHandler : IRequestHandler<GetProductReportQuery, Result<ProductReportDto>>
{
    private record LineRow(Guid ProductId, string ProductName, Guid CategoryId, string CategoryName, decimal UnitPrice, int Quantity, decimal PaymentTotalAmount, decimal PaymentDiscountAmount);
    private record ProductAgg(string ProductName, string CategoryName, int Sold, decimal Revenue);
    private record CategoryAgg(string CategoryName, int Sold, decimal Revenue);

    private readonly IAppDbContext _db;
    private readonly IReportScopeResolver _scope;
    private readonly IBusinessDayResolver _businessDay;

    public GetProductReportQueryHandler(IAppDbContext db, IReportScopeResolver scope, IBusinessDayResolver businessDay)
    {
        _db = db;
        _scope = scope;
        _businessDay = businessDay;
    }

    public async Task<Result<ProductReportDto>> Handle(GetProductReportQuery request, CancellationToken cancellationToken)
    {
        DateOnly from = request.From;
        DateOnly to = request.To < request.From ? request.From : request.To;

        List<Branch> branches = await _scope.ResolveAsync(request.BranchId, cancellationToken);
        if (branches.Count == 0)
            return Result<ProductReportDto>.Success(new ProductReportDto());

        Dictionary<Guid, ProductAgg> productAgg = [];
        Dictionary<Guid, CategoryAgg> categoryAgg = [];
        HashSet<Guid> soldProductIds = [];
        List<NeverSoldProductDto> neverSold = [];

        foreach (Branch branch in branches)
        {
            (DateTime fromUtc, DateTime toUtc) = _businessDay.ToUtcRange(branch, from, to);

            List<LineRow> rows = await _db.PaymentLineItems
                .AsNoTracking()
                .Where(l => l.Payment.CashRegister.BranchId == branch.Id && l.Payment.CreatedAt >= fromUtc && l.Payment.CreatedAt < toUtc)
                .Select(l => new LineRow(l.ProductId, l.ProductName, l.CategoryId, l.CategoryName, l.UnitPrice, l.Quantity, l.Payment.TotalAmount, l.Payment.DiscountAmount))
                .ToListAsync(cancellationToken);

            foreach (LineRow row in rows)
            {
                decimal grossLineTotal = row.UnitPrice * row.Quantity;
                decimal grossPaymentTotal = row.PaymentTotalAmount + row.PaymentDiscountAmount;
                decimal discountRatio = grossPaymentTotal > 0 ? row.PaymentDiscountAmount / grossPaymentTotal : 0;
                decimal effectiveRevenue = grossLineTotal * (1 - discountRatio);

                soldProductIds.Add(row.ProductId);

                var pAgg = productAgg.GetValueOrDefault(row.ProductId, new ProductAgg(row.ProductName, row.CategoryName, 0, 0));
                productAgg[row.ProductId] = pAgg with { Sold = pAgg.Sold + row.Quantity, Revenue = pAgg.Revenue + effectiveRevenue };

                var cAgg = categoryAgg.GetValueOrDefault(row.CategoryId, new CategoryAgg(row.CategoryName, 0, 0));
                categoryAgg[row.CategoryId] = cAgg with { Sold = cAgg.Sold + row.Quantity, Revenue = cAgg.Revenue + effectiveRevenue };
            }

            List<Product> neverSoldProducts = await _db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Where(p => p.Category.BranchId == branch.Id && p.IsActive)
                .ToListAsync(cancellationToken);

            neverSold.AddRange(neverSoldProducts
                .Where(p => !soldProductIds.Contains(p.Id))
                .Select(p => new NeverSoldProductDto { ProductId = p.Id, ProductName = p.Name, CategoryName = p.Category.Name, Price = p.Price }));
        }

        decimal totalRevenue = productAgg.Values.Sum(p => p.Revenue);

        List<ProductSalesRowDto> products = productAgg
            .Select(kv => new ProductSalesRowDto
            {
                ProductId = kv.Key,
                ProductName = kv.Value.ProductName,
                CategoryName = kv.Value.CategoryName,
                Sold = kv.Value.Sold,
                Revenue = kv.Value.Revenue,
                AvgUnitPrice = kv.Value.Sold > 0 ? kv.Value.Revenue / kv.Value.Sold : 0
            })
            .OrderByDescending(p => p.Revenue)
            .ToList();

        List<CategorySalesRowDto> categories = categoryAgg
            .Select(kv => new CategorySalesRowDto
            {
                CategoryId = kv.Key,
                CategoryName = kv.Value.CategoryName,
                Sold = kv.Value.Sold,
                Revenue = kv.Value.Revenue,
                Percent = totalRevenue > 0 ? Math.Round(kv.Value.Revenue / totalRevenue * 100, 1) : 0
            })
            .OrderByDescending(c => c.Revenue)
            .ToList();

        return Result<ProductReportDto>.Success(new ProductReportDto
        {
            Products = products,
            CategoryBreakdown = categories,
            NeverSoldProducts = neverSold.OrderBy(p => p.ProductName).ToList()
        });
    }
}
