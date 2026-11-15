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
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new SearchStockImagesQuery { Q = q }, cancellationToken);
        return HandleResult(result);
    }
}
