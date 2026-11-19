namespace RestaurantBill.Application.Features.DataManagement;

// "Verileri sil" sayfasının seçenekleri. Anahtarlar ön yüzle aynıdır (JSON'da düz metin).

/// <summary>Seçerek silinebilen veri grupları.</summary>
public static class DataGroups
{
    public const string Sales = "sales";
    public const string Reservations = "reservations";
    public const string Delivery = "delivery";
    public const string OrderRequests = "orderRequests";
    public const string Messages = "messages";
    public const string Menu = "menu";
    public const string Tables = "tables";
    public const string Site = "site";
    public const string Staff = "staff";
    public const string AuditLogs = "auditLogs";

    public static readonly IReadOnlyList<string> All =
        [Sales, Reservations, Delivery, OrderRequests, Messages, Menu, Tables, Site, Staff, AuditLogs];

    /// <summary>Tarih süzgeci ("şu tarihten eski olanlar") alan geçmiş grupları.</summary>
    public static readonly IReadOnlySet<string> History = new HashSet<string> { Sales, Reservations, Delivery, Messages, AuditLogs };

    public static string Label(string key) => key switch
    {
        Sales => "Satış geçmişi",
        Reservations => "Rezervasyonlar",
        Delivery => "Paket siparişler ve müşteri telefonları",
        OrderRequests => "Masa sipariş istekleri",
        Messages => "Müşteri mesajları",
        Menu => "Menü",
        Tables => "Masalar ve bölümler",
        Site => "Restoran sitesi içeriği",
        Staff => "Çalışan hesapları",
        AuditLogs => "İşlem kayıtları",
        _ => key
    };
}

/// <summary>Varsayılanlarına döndürülebilen şube ayarları. Geçmiş veriye dokunmaz.</summary>
public static class ResetItems
{
    public const string WorkingHours = "workingHours";
    public const string Site = "site";
    public const string Reservations = "reservations";
    public const string OnlineOrdering = "onlineOrdering";
    public const string DeliveryZones = "deliveryZones";
    public const string QrFeatures = "qrFeatures";
    public const string Payment = "payment";
    public const string DayEnd = "dayEnd";
    public const string RestaurantInfo = "restaurantInfo";

    public static readonly IReadOnlyList<string> All =
        [WorkingHours, Site, Reservations, OnlineOrdering, DeliveryZones, QrFeatures, Payment, DayEnd, RestaurantInfo];

    public static string Label(string key) => key switch
    {
        WorkingHours => "Çalışma saatleri",
        Site => "Site ayarları ve içeriği",
        Reservations => "Rezervasyon ayarları",
        OnlineOrdering => "Online sipariş ayarları",
        DeliveryZones => "Teslimat bölgeleri",
        QrFeatures => "Masa QR özellikleri",
        Payment => "Ödeme ayarları (IBAN)",
        DayEnd => "Gün sonu saati",
        RestaurantInfo => "Restoran bilgileri",
        _ => key
    };

    /// <summary>Önizlemede maddenin ne yapacağı, tek cümle.</summary>
    public static string Description(string key) => key switch
    {
        WorkingHours => "Açılış, kapanış ve haftalık saatler silinir.",
        Site => "Restoran sitesi bütün şubelerde ortaktır: sitenin metinleri, fotoğrafları, teması ve taslağı silinir; şubenin WhatsApp ve nasıl gelinir bilgisi boşalır.",
        Reservations => "Rezervasyon kuralları ilk hâline döner.",
        OnlineOrdering => "Online sipariş kapanır, kuralları ilk hâline döner.",
        DeliveryZones => "Teslimat bölgeleri silinir.",
        QrFeatures => "Masa QR'ındaki tüm özellikler yeniden açılır.",
        Payment => "IBAN ve hesap sahibi silinir.",
        DayEnd => "Gün sonu 00:00, saat dilimi İstanbul olur.",
        RestaurantInfo => "Adres silinir, yetkili ve iletişim bilgisi hesap sahibinin olur, KDV %10 olur.",
        _ => string.Empty
    };
}
