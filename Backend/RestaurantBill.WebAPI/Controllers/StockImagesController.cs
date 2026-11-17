using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.StockImages;

namespace RestaurantBill.WebAPI.Controllers;

// Hazır görsel kütüphanesi (ortak, şubeye bağlı değil). Ürün/menü düzenleyicisindeki "Hazır görsellerden seç" kullanır.
// Seçim: POST api/product/{id}/stock-image ve POST api/set-menu/{id}/stock-image.
[Authorize(Roles = "Owner,Admin")]
[Route("api/stock-images")]
[ApiController]
public class StockImagesController : BaseController
{
    private readonly IMediator _mediator;

    public StockImagesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Searches the stock image library (Turkish, diacritics-insensitive: "cay" finds "Çay"). Empty q returns the default
    /// list. Ranking: exact title &gt; keyword / prefix &gt; contains; at most 48 results. Each item has the full CDN url.
    /// scope: all (default), venue (site photos: venue groups first; empty q returns venue groups only) or food (products
    /// and set menus: venue groups excluded). group: optional single group name.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] StockImageScope? scope, [FromQuery] string? group,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new SearchStockImagesQuery { Q = q, Scope = scope ?? StockImageScope.All, Group = group }, cancellationToken);
        return HandleResult(result);
    }
}
