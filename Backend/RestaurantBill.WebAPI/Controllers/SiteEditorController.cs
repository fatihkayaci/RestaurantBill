using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.Branches.Site;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.WebAPI.Controllers;

// Görsel site düzenleyicisi (Taslak + Yayınla). Restoran sitesi şirket genelidir: yalnız sahip, şirketin TASLAĞINA yazar;
// müşteri sitesi Yayınla'ya kadar eski hâli gösterir. Sürüm taşıyan uçlar (kaydet, geri al, yayınla, at) eski sürümde
// 409 { error, editor } döner. Şubeye ait bilgiler (saatler, WhatsApp, nasıl gelinir): BranchController "site-info".
// Sözleşme: docs/site-editor.md.
[Authorize(Roles = "Owner")]
[Route("api/company/site")]
[ApiController]
public class SiteEditorController : BaseController
{
    private const long MaxUploadBytes = 10_000_000;

    private readonly IMediator _mediator;

    public SiteEditorController(IMediator mediator)
    {
        _mediator = mediator;
    }

    public class StockImageSelection
    {
        public Guid StockImageId { get; set; }
    }

    public class VersionBody
    {
        public int Version { get; set; }
    }

    /// <summary>
    /// "Sitenizi güzelleştirin": sitenin doluluk puanı ve görsel etkisine göre sıralı yapılacaklar.
    /// <c>?draft=true</c>: taslağı puanlar (site düzenleyicisi); yoksa yayındaki site (Genel Bakış kartı).
    /// </summary>
    [HttpGet("completeness")]
    public async Task<IActionResult> GetCompleteness([FromQuery] bool draft, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new GetSiteCompletenessQuery { Draft = draft }, cancellationToken));

    /// <summary>Düzenleyicinin bütün durumu: taslak, yayındaki, değişen alanlar, sürüm, SEO önizlemesi.</summary>
    [HttpGet("draft")]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new GetSiteEditorQuery(), cancellationToken));

    /// <summary>Taslağın metinleri (otomatik kayıt). Gövde: eski PUT api/branch/site alanları + version, seoTitle, seoDescription.</summary>
    [HttpPut("draft")]
    public async Task<IActionResult> Save([FromBody] SaveSiteDraftCommand command, CancellationToken cancellationToken)
        => DraftResult(await _mediator.Send(command, cancellationToken));

    /// <summary>Alan bazında "Geri al": { version, fields: ["coverImage", "region:{id}"] } yayındaki değerine döner.</summary>
    [HttpPost("draft/revert")]
    public async Task<IActionResult> Revert([FromBody] RevertSiteDraftFieldsCommand command, CancellationToken cancellationToken)
        => DraftResult(await _mediator.Send(command, cancellationToken));

    [HttpPost("draft/publish")]
    public async Task<IActionResult> Publish([FromBody] VersionBody body, CancellationToken cancellationToken)
        => DraftResult(await _mediator.Send(new PublishSiteDraftCommand { Version = body.Version }, cancellationToken));

    [HttpPost("draft/discard")]
    public async Task<IActionResult> Discard([FromBody] VersionBody body, CancellationToken cancellationToken)
        => DraftResult(await _mediator.Send(new DiscardSiteDraftCommand { Version = body.Version }, cancellationToken));

    // ── Tek fotoğraflık alanlar: cover, about, founder, share ───────────────────────────────────
    [HttpPost("draft/image/{slot}")]
    [RequestSizeLimit(11_000_000)]
    public async Task<IActionResult> UploadImage([FromRoute] string slot, IFormFile file, CancellationToken cancellationToken)
    {
        if (!TryParseSlot(slot, out SiteDraftImageTarget target)) return BadRequest(new { Error = "Geçersiz görsel alanı." });
        return await UploadAsync(file, stream => new SetSiteDraftImageCommand { Target = target, Content = stream }, cancellationToken);
    }

    [HttpPost("draft/image/{slot}/stock")]
    public async Task<IActionResult> SelectStockImage([FromRoute] string slot, [FromBody] StockImageSelection body, CancellationToken cancellationToken)
    {
        if (!TryParseSlot(slot, out SiteDraftImageTarget target)) return BadRequest(new { Error = "Geçersiz görsel alanı." });
        return HandleResult(await _mediator.Send(new SetSiteDraftImageCommand { Target = target, StockImageId = body.StockImageId }, cancellationToken));
    }

    [HttpDelete("draft/image/{slot}")]
    public async Task<IActionResult> RemoveImage([FromRoute] string slot, CancellationToken cancellationToken)
    {
        if (!TryParseSlot(slot, out SiteDraftImageTarget target)) return BadRequest(new { Error = "Geçersiz görsel alanı." });
        return HandleResult(await _mediator.Send(new SetSiteDraftImageCommand { Target = target }, cancellationToken));
    }

    // ── Mekân fotoğrafları (galeri). ?index=N verilirse o fotoğraf değişir, yoksa sona eklenir ─────────
    [HttpPost("draft/gallery")]
    [RequestSizeLimit(11_000_000)]
    public async Task<IActionResult> UploadGalleryImage(IFormFile file, [FromQuery] int? index, CancellationToken cancellationToken)
        => await UploadAsync(file, stream => new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, GalleryIndex = index, Content = stream },
            cancellationToken);

    [HttpPost("draft/gallery/stock")]
    public async Task<IActionResult> SelectGalleryStockImage([FromBody] StockImageSelection body, [FromQuery] int? index, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new SetSiteDraftImageCommand
        {
            Target = SiteDraftImageTarget.Gallery, GalleryIndex = index, StockImageId = body.StockImageId,
        }, cancellationToken));

    [HttpDelete("draft/gallery/{index:int}")]
    public async Task<IActionResult> RemoveGalleryImage([FromRoute] int index, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, GalleryIndex = index }, cancellationToken));

    /// <summary>{ "order": [2, 0, 1] }</summary>
    [HttpPut("draft/gallery/order")]
    public async Task<IActionResult> ReorderGallery([FromBody] ReorderSiteDraftGalleryCommand command, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(command, cancellationToken));

    // ── Oturma bölümünün fotoğrafı ──────────────────────────────────────────────────────────────
    [HttpPost("draft/regions/{regionId:guid}/image")]
    [RequestSizeLimit(11_000_000)]
    public async Task<IActionResult> UploadRegionImage([FromRoute] Guid regionId, IFormFile file, CancellationToken cancellationToken)
        => await UploadAsync(file, stream => new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = regionId, Content = stream },
            cancellationToken);

    [HttpPost("draft/regions/{regionId:guid}/image/stock")]
    public async Task<IActionResult> SelectRegionStockImage([FromRoute] Guid regionId, [FromBody] StockImageSelection body, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new SetSiteDraftImageCommand
        {
            Target = SiteDraftImageTarget.Region, RegionId = regionId, StockImageId = body.StockImageId,
        }, cancellationToken));

    [HttpDelete("draft/regions/{regionId:guid}/image")]
    public async Task<IActionResult> RemoveRegionImage([FromRoute] Guid regionId, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = regionId }, cancellationToken));

    private async Task<IActionResult> UploadAsync(IFormFile file, Func<Stream, SetSiteDraftImageCommand> command, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0) return BadRequest(new { Error = "Dosya seçilmedi." });
        if (file.Length > MaxUploadBytes) return BadRequest(new { Error = "Görsel en fazla 10 MB olabilir." });
        // Biçim depolama servisinde dosyanın baytlarından doğrulanır (yalnızca JPEG/PNG/WebP).

        await using Stream stream = file.OpenReadStream();
        return HandleResult(await _mediator.Send(command(stream), cancellationToken));
    }

    private IActionResult DraftResult(Result<SiteDraftResultDto> result)
    {
        if (result.IsSuccess && result.Value!.Conflict)
            return Conflict(new { Error = SiteEditorMessages.Conflict, result.Value.Editor });
        if (result.IsSuccess) return Ok(result.Value!.Editor);
        return BadRequest(new { result.Error });
    }

    private static bool TryParseSlot(string value, out SiteDraftImageTarget target)
    {
        target = value.ToLowerInvariant() switch
        {
            "cover" => SiteDraftImageTarget.Cover,
            "about" => SiteDraftImageTarget.About,
            "founder" => SiteDraftImageTarget.Founder,
            "share" => SiteDraftImageTarget.Share,
            "hero-menu" => SiteDraftImageTarget.MenuHero,
            "hero-hakkimizda" => SiteDraftImageTarget.AboutHero,
            "hero-mekan" => SiteDraftImageTarget.VenueHero,
            "hero-iletisim" => SiteDraftImageTarget.ContactHero,
            "hero-rezervasyon" => SiteDraftImageTarget.ReservationHero,
            _ => 0,
        };
        return target != 0;
    }
}
