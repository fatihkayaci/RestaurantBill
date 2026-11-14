using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;

/// <summary>
/// Siparişe bir menü ekler. Her bölüm için bir seçim gönderilir; seçim gönderilmeyen bölümde varsayılan seçenek
/// kullanılır. Fiyat sunucuda hesaplanır (menü fiyatı + seçilen seçeneklerin ek ücreti). Dönen değer menü satırının Id'si.
/// </summary>
public class AddSetMenuToOrderCommand : IRequest<Result<Guid>>
{
    public Guid OrderId { get; set; }
    public Guid SetMenuId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? Note { get; set; }
    public List<SetMenuSelectionInput> Selections { get; set; } = [];
}

public class SetMenuSelectionInput
{
    public Guid SlotId { get; set; }
    public Guid ProductId { get; set; }
}
