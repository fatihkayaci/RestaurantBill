using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.AddLinesToOrder;

/// <summary>
/// Garsonun "Mutfağa gönder"i: sepetteki tüm ürün ve menü satırlarını siparişe tek seferde ekler. Hepsi birlikte kaydedilir
/// ya da hiçbiri kaydedilmez; bir satır eklenemezse istek o satırı belirten hatayla döner ve sipariş değişmez.
/// </summary>
public class AddLinesToOrderCommand : IRequest<Result>
{
    public Guid OrderId { get; set; }
    /// <summary>Doluysa siparişin notu bununla değişir (add-product ile aynı).</summary>
    public string? Note { get; set; }
    public List<CreateOrderItemDto> Products { get; set; } = [];
    public List<SetMenuLineDto> SetMenus { get; set; } = [];
}

/// <summary>Siparişe eklenecek bir menü satırı. Seçim gönderilmeyen bölümde varsayılan seçenek kullanılır.</summary>
public class SetMenuLineDto
{
    public Guid SetMenuId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? Note { get; set; }
    public List<SetMenuSelectionInput> Selections { get; set; } = [];
}
