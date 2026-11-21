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
}
