using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

// Müşteri masadaki QR'dan "Garson çağır"a bastı: masaya bakan garsonlara ve şube yöneticilerine giden canlı bildirim.
public class WaiterCalledDto
{
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public Guid RegionId { get; set; }
    public string RegionName { get; set; } = string.Empty;
    public DateTime CalledAt { get; set; }
    /// <summary>Çağrı anında masada açık hesap yoktu: QR dışarıdan (fotoğraftan) kullanılmış olabilir.</summary>
    public bool TableLooksEmpty { get; set; }
    /// <summary>"Garson çağır" nedeni (1 Su, 2 Peçete/çatal, 3 Diğer); null: nedensiz çağrı.</summary>
    public WaiterCallReason? Reason { get; set; }
    /// <summary>Yalnız "Diğer"de müşterinin kısa notu (en fazla 100 karakter); yoksa null.</summary>
    public string? Note { get; set; }
    /// <summary>Yalnız CustomerBillRequested'da: müşterinin ödeme tercihi (1 Nakit, 2 Kart, 3 IBAN); null: belirtilmedi.</summary>
    public BillPaymentHint? PaymentHint { get; set; }
    /// <summary>Yalnız CustomerBillRequested'da: hesap kaç kişiye bölünecek; null: bölünmeyecek.</summary>
    public int? SplitCount { get; set; }
    /// <summary>Yalnız CustomerBillRequested'da: istek anında ödenecek kalan (kişi başı ipucu için).</summary>
    public decimal? Remaining { get; set; }
}

/// <summary>Hesap isteğindeki müşteri tercihi; kasiyerin "BillRequested" olayının dördüncü argümanı.</summary>
public class BillRequestHintDto
{
    public BillPaymentHint? PaymentHint { get; set; }
    public int? SplitCount { get; set; }
    /// <summary>İstek anında ödenecek kalan.</summary>
    public decimal Remaining { get; set; }

    public static BillRequestHintDto From(RestaurantBill.Domain.Entities.Order order) => new()
    {
        PaymentHint = order.BillPaymentHint,
        SplitCount = order.BillSplitCount,
        Remaining = order.RemainingAmount,
    };
}
