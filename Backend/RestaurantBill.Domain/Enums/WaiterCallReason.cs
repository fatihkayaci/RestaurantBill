namespace RestaurantBill.Domain.Enums;

/// <summary>Masadaki müşterinin "Garson çağır" nedeni. "Hesap" neden değildir: hesap isteği kendi akışından gider.</summary>
public enum WaiterCallReason
{
    Water = 1,
    // Peçete / çatal
    Cutlery = 2,
    Other = 3,
}
