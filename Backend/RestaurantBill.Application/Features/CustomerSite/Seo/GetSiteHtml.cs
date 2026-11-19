using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Seo;

/// <summary>
/// Restoran sitesinin HTML'i: ön yüzün index.html'i, restoranın YAYINDAKİ başlık/açıklama/og değerleriyle (botlar için).
/// Restoran bulunamazsa ya da bir hata olursa index.html değiştirilmeden döner (asla 500 değil). Failure yalnızca
/// index.html hiç alınamadığında döner; nginx bu durumda (503) isteği doğrudan ön yüze verir.
/// </summary>
public class GetSiteHtmlQuery : IRequest<Result<string>>
{
    /// <summary>Tarayıcıdaki yol: "/", "/menu", "/rezervasyon/abc"...</summary>
    public string Path { get; set; } = "/";
}

public class GetSiteHtmlQueryHandler(
    IAppDbContext db,
    ITenantResolver tenant,
    ISiteIndexHtmlSource indexHtml,
    IOptions<BunnyStorageOptions> storageOptions,
    IOptions<SeoOptions> seoOptions,
    ILogger<GetSiteHtmlQueryHandler> logger)
    : IRequestHandler<GetSiteHtmlQuery, Result<string>>
{
    public const string UnavailableMessage = "Sayfa şu an hazırlanamadı.";

    public async Task<Result<string>> Handle(GetSiteHtmlQuery request, CancellationToken cancellationToken)
    {
        string? html = await indexHtml.GetAsync(cancellationToken);
        if (html is null) return Result<string>.Failure(UnavailableMessage);

        try
        {
            SiteMeta? meta = await BuildMetaAsync(request.Path, cancellationToken);
            return Result<string>.Success(meta is null ? html : SiteMetaHtml.Inject(html, meta));
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Site HTML etiketleri yazılamadı; index.html değiştirilmeden verildi (slug {Slug}).", tenant.Slug);
            return Result<string>.Success(html);
        }
    }

    private async Task<SiteMeta?> BuildMetaAsync(string? path, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null) return null;

        Branch? branch = await CustomerSiteScope.ResolveBranchAsync(db, company.Id, null, cancellationToken);
        if (branch is null) return null;

        // Site şirket genelidir; otomatik açıklamadaki saatler ve ilçe varsayılan şubeden (en eski) gelir.
        SiteSeoValues seo = SiteSeo.Resolve(branch.SiteFor(company.GetPublishedSite()), company.Name, branch.BranchName, branch.District);
        SitePageTitle page = SiteSeo.PageTitle(path, seo.RestaurantName, seo.Title);

        string rootDomain = seoOptions.Value.RootDomain.Trim().Trim('.');
        string url = rootDomain.Length > 0 && company.Slug.Length > 0
            ? $"https://{company.Slug}.{rootDomain}{SiteSeo.NormalizePath(path)}"
            : string.Empty;

        return new SiteMeta(
            page.Title,
            seo.Description,
            seo.RestaurantName,
            url,
            BranchSiteDto.ImageUrl(storageOptions.Value.CdnBaseUrl.TrimEnd('/'), seo.ShareImageKey),
            page.NoIndex);
    }
}
