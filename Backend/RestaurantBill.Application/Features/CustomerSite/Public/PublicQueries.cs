using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// ── Restoran sitesi: şube bilgisi, menü, masalar ────────────────────────────────────────────────
public class GetPublicSiteQuery : IRequest<Result<PublicSiteDto>>
{
    public Guid? BranchId { get; set; }
}

public class GetPublicSiteQueryHandler(IAppDbContext db, ITenantResolver tenant, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<GetPublicSiteQuery, Result<PublicSiteDto>>
{
    public async Task<Result<PublicSiteDto>> Handle(GetPublicSiteQuery request, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<PublicSiteDto>.Failure("Restoran bulunamadı.");

        Branch? branch = await CustomerSiteScope.ResolveBranchAsync(db, company.Id, request.BranchId, cancellationToken);
        if (branch is null)
            return Result<PublicSiteDto>.Failure("Restoran bulunamadı.");

        string cdnBaseUrl = storageOptions.Value.CdnBaseUrl.TrimEnd('/');

        var categories = await db.Categories.AsNoTracking()
            .Where(c => c.BranchId == branch.Id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new PublicCategoryDto { Id = c.Id, Name = c.Name })
            .ToListAsync(cancellationToken);

        var products = await db.Products.AsNoTracking()
            .Where(p => p.Category.BranchId == branch.Id && p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new { p.Id, p.Name, p.Price, p.ImageUrl, p.CategoryId })
            .ToListAsync(cancellationToken);

        foreach (PublicCategoryDto category in categories)
        {
            category.Products = products
                .Where(p => p.CategoryId == category.Id)
                .Select(p => new PublicProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = p.Price,
                    ImageUrl = string.IsNullOrWhiteSpace(p.ImageUrl) ? string.Empty : $"{cdnBaseUrl}/{p.ImageUrl}"
                })
                .ToList();
        }

        var regions = await db.Regions.AsNoTracking()
            .Where(r => r.BranchId == branch.Id)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new PublicRegionDto { Id = r.Id, Name = r.Name })
            .ToListAsync(cancellationToken);

        var tables = await db.Tables.AsNoTracking()
            .Where(t => t.Region.BranchId == branch.Id && t.Status != TableStatus.OutOfService)
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name, t.RegionId })
            .ToListAsync(cancellationToken);

        foreach (PublicRegionDto region in regions)
        {
            region.Tables = tables
                .Where(t => t.RegionId == region.Id)
                .Select(t => new PublicTableDto { Id = t.Id, Name = t.Name })
                .ToList();
        }

        var branches = await db.Branches.AsNoTracking()
            .Where(b => b.CompanyId == company.Id && !b.IsDeleted)
            .OrderBy(b => b.CreatedAt)
            .Select(b => new PublicBranchDto { Id = b.Id, Name = b.BranchName })
            .ToListAsync(cancellationToken);

        return Result<PublicSiteDto>.Success(new PublicSiteDto
        {
            CompanyName = company.Name,
            BranchId = branch.Id,
            BranchName = branch.BranchName,
            City = branch.City,
            District = branch.District,
            OpenAddress = branch.OpenAddress,
            Phone = branch.Number,
            Branches = branches,
            Categories = categories.Where(c => c.Products.Count > 0).ToList(),
            Regions = regions.Where(r => r.Tables.Count > 0).ToList()
        });
    }
}

// ── Masa QR'ı: masa adı ve şubesi ───────────────────────────────────────────────────────────────
public class GetPublicTableQuery : IRequest<Result<PublicTableInfoDto>>
{
    public Guid TableId { get; set; }
}

public class GetPublicTableQueryHandler(IAppDbContext db, ITenantResolver tenant)
    : IRequestHandler<GetPublicTableQuery, Result<PublicTableInfoDto>>
{
    public async Task<Result<PublicTableInfoDto>> Handle(GetPublicTableQuery request, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<PublicTableInfoDto>.Failure("Restoran bulunamadı.");

        PublicTableInfoDto? table = await db.Tables.AsNoTracking()
            .Where(t => t.Id == request.TableId
                && t.Region.Branch.CompanyId == company.Id
                && t.Status != TableStatus.OutOfService)
            .Select(t => new PublicTableInfoDto { Id = t.Id, Name = t.Name, RegionName = t.Region.Name, BranchId = t.Region.BranchId })
            .FirstOrDefaultAsync(cancellationToken);

        return table is null
            ? Result<PublicTableInfoDto>.Failure("Bu masa bulunamadı. Lütfen garsona haber verin.")
            : Result<PublicTableInfoDto>.Success(table);
    }
}

// ── Rezervasyon: seçilen saat aralığında dolu masalar ───────────────────────────────────────────
public class GetReservationAvailabilityQuery : IRequest<Result<AvailabilityDto>>
{
    public Guid? BranchId { get; set; }
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class GetReservationAvailabilityQueryHandler(IAppDbContext db, ITenantResolver tenant)
    : IRequestHandler<GetReservationAvailabilityQuery, Result<AvailabilityDto>>
{
    public async Task<Result<AvailabilityDto>> Handle(GetReservationAvailabilityQuery request, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<AvailabilityDto>.Failure("Restoran bulunamadı.");

        Branch? branch = await CustomerSiteScope.ResolveBranchAsync(db, company.Id, request.BranchId, cancellationToken);
        if (branch is null)
            return Result<AvailabilityDto>.Failure("Restoran bulunamadı.");

        string? error = CustomerSiteScope.TryResolveSlot(branch.TimeZoneId, request.Date, request.Time, DateTime.UtcNow, out DateTime startUtc, out DateTime endUtc);
        if (error is not null)
            return Result<AvailabilityDto>.Failure(error);

        List<Guid> tableIds = await db.Tables.AsNoTracking()
            .Where(t => t.Region.BranchId == branch.Id)
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        List<Reservation> overlapping = await CustomerSiteScope.FindOverlappingAsync(
            db, tableIds, startUtc, endUtc, CustomerSiteScope.BlockingStatuses, cancellationToken);

        return Result<AvailabilityDto>.Success(new AvailabilityDto
        {
            UnavailableTableIds = overlapping.Select(r => r.TableId).Distinct().ToList()
        });
    }
}

// ── Müşterinin gönderdiği talebin durumu ────────────────────────────────────────────────────────
public class GetOrderRequestStatusQuery : IRequest<Result<OrderRequestStatusDto>>
{
    public Guid Id { get; set; }
}

public class GetOrderRequestStatusQueryHandler(IAppDbContext db, ITenantResolver tenant)
    : IRequestHandler<GetOrderRequestStatusQuery, Result<OrderRequestStatusDto>>
{
    public async Task<Result<OrderRequestStatusDto>> Handle(GetOrderRequestStatusQuery request, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<OrderRequestStatusDto>.Failure("Restoran bulunamadı.");

        var row = await db.OrderRequests.AsNoTracking()
            .Where(r => r.Id == request.Id && r.Table.Region.Branch.CompanyId == company.Id)
            .Select(r => new { r.Id, r.Status })
            .FirstOrDefaultAsync(cancellationToken);

        return row is null
            ? Result<OrderRequestStatusDto>.Failure("Sipariş talebi bulunamadı.")
            : Result<OrderRequestStatusDto>.Success(new OrderRequestStatusDto { Id = row.Id, Status = (int)row.Status });
    }
}

public class GetReservationStatusQuery : IRequest<Result<ReservationStatusDto>>
{
    public Guid Id { get; set; }
}

public class GetReservationStatusQueryHandler(IAppDbContext db, ITenantResolver tenant)
    : IRequestHandler<GetReservationStatusQuery, Result<ReservationStatusDto>>
{
    public async Task<Result<ReservationStatusDto>> Handle(GetReservationStatusQuery request, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<ReservationStatusDto>.Failure("Restoran bulunamadı.");

        var row = await db.Reservations.AsNoTracking()
            .Where(r => r.Id == request.Id && r.Table.Region.Branch.CompanyId == company.Id)
            .Select(r => new
            {
                r.Id, r.Status, r.GuestName, r.PartySize, r.ReservationTime, r.EndTime,
                TableName = r.Table.Name,
                r.Table.Region.Branch.TimeZoneId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (row is null)
            return Result<ReservationStatusDto>.Failure("Rezervasyon bulunamadı.");

        TimeZoneInfo zone = CustomerSiteScope.ZoneOf(row.TimeZoneId);
        DateTime end = row.EndTime ?? row.ReservationTime.AddMinutes(CustomerSiteScope.ReservationDurationMinutes);

        return Result<ReservationStatusDto>.Success(new ReservationStatusDto
        {
            Id = row.Id,
            Status = (int)row.Status,
            TableName = row.TableName,
            GuestName = row.GuestName,
            PartySize = row.PartySize,
            Date = CustomerSiteScope.LocalDate(row.ReservationTime, zone),
            Time = CustomerSiteScope.LocalTime(row.ReservationTime, zone),
            EndTime = CustomerSiteScope.LocalTime(end, zone)
        });
    }
}
