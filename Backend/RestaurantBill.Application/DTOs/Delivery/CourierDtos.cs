using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs.Delivery
{
    /// <summary>SignalR "CourierOrdersChanged" (kurye hub'ı): kuryenin siparişleri değişti, ekran yeniden çeker.</summary>
    public class CourierOrdersChangedDto
    {
        public Guid CourierUserId { get; set; }
        public Guid? DeliveryOrderId { get; set; }
    }

    /// <summary>Kurye ekranındaki sipariş kartı: yalnızca kuryenin kendi siparişleri.</summary>
    public class CourierOrderDto
    {
        public Guid Id { get; set; }
        public int Number { get; set; }
        public DeliveryOrderStatus Status { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string AddressDirections { get; set; } = string.Empty;
        public string ZoneName { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        /// <summary>Harita araması: "adres, bölge, şehir". İstemci Google Maps bağlantısına kodlayarak koyar.</summary>
        public string MapsQuery { get; set; } = string.Empty;
        public List<DeliveryLineDto> Lines { get; set; } = [];
        public decimal Subtotal { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal Total { get; set; }
        /// <summary>Müşterinin kapıda ödeme tercihi (Nakit/Kart).</summary>
        public PaymentMethod PaymentPreference { get; set; }
        public DateTime? AcceptedAt { get; set; }
        /// <summary>Müşteriye söylenen teslim zamanı (kabul + süre).</summary>
        public DateTime? EstimatedDeliveryAt { get; set; }
        public DateTime? DispatchedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public PaymentMethod? CollectedMethod { get; set; }
        public decimal? CollectedAmount { get; set; }
        /// <summary>Kasiyer tahsilatı teslim aldı mı.</summary>
        public DateTime? SettledAt { get; set; }
        /// <summary>"Yola çıktım" basılabilir mi (sipariş hazır).</summary>
        public bool CanDispatch { get; set; }
        /// <summary>"Teslim ettim" basılabilir mi (sipariş yolda).</summary>
        public bool CanDeliver { get; set; }
        /// <summary>"Teslimi geri al" bu ana kadar basılabilir (UTC); süre geçtiyse ya da kasaya teslim edildiyse null.</summary>
        public DateTime? UndoDeliverUntil { get; set; }
    }

    /// <summary>"Hepsiyle yola çık" sonucu.</summary>
    public class CourierBulkDispatchResultDto
    {
        public int DispatchedCount { get; set; }
        public List<int> DispatchedNumbers { get; set; } = [];
        /// <summary>İstenip yola çıkarılamayanlar (artık hazır değil, iptal edildi ya da başka kuryeye geçti).</summary>
        public int SkippedCount { get; set; }
    }

    /// <summary>Kuryenin "Bugün" özeti ve üzerindeki, kasaya teslim edilmemiş tahsilat.</summary>
    public class CourierDaySummaryDto
    {
        public int DeliveredTodayCount { get; set; }
        public int ActiveOrderCount { get; set; }
        /// <summary>Teslim edilmiş, kasiyerin henüz teslim almadığı nakit (gün ayrımı yok).</summary>
        public decimal OutstandingCash { get; set; }
        public int OutstandingCashOrderCount { get; set; }
        public decimal OutstandingCard { get; set; }
        public int OutstandingCardOrderCount { get; set; }
    }

    /// <summary>Kasiyerin "Teslim al" listesindeki, kuryenin tahsil edip kasaya teslim etmediği sipariş.</summary>
    public class CourierOutstandingOrderDto
    {
        public Guid DeliveryOrderId { get; set; }
        public int Number { get; set; }
        public string ZoneName { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public PaymentMethod CollectedMethod { get; set; }
        public decimal CollectedAmount { get; set; }
        public DateTime? DeliveredAt { get; set; }
        /// <summary>Kuryenin tahsil ettiği an (UTC).</summary>
        public DateTime? CollectedAt { get; set; }
        /// <summary>Tahsilat önceki bir iş gününde yapıldı ve hâlâ kasaya teslim edilmedi.</summary>
        public bool IsFromPreviousDay { get; set; }
    }

    /// <summary>"Teslim al" sonucu: kasaya geçen sipariş sayısı ve tutarlar.</summary>
    public class CourierHandoverResultDto
    {
        public int SettledCount { get; set; }
        public decimal CashAmount { get; set; }
        public decimal CardAmount { get; set; }
        public decimal Total => CashAmount + CardAmount;
        /// <summary>Kasaya girmesi beklenen nakit (CashAmount ile aynı).</summary>
        public decimal ExpectedCash { get; set; }
        /// <summary>Kasiyerin saydığı nakit; sayım girilmediyse ya da teslimde nakit yoksa null.</summary>
        public decimal? CountedCash { get; set; }
        /// <summary>Sayılan − beklenen; eksi = eksik. Sayım yoksa null.</summary>
        public decimal? CashDifference { get; set; }
    }

    /// <summary>"Teslim geçmişi"nde bir teslim: aynı anda, aynı kasiyerce teslim alınan siparişler.</summary>
    public class CourierHandoverHistoryDto
    {
        public DateTime SettledAt { get; set; }
        public Guid CourierUserId { get; set; }
        public string CourierName { get; set; } = string.Empty;
        public string SettledByName { get; set; } = string.Empty;
        public int OrderCount { get; set; }
        public List<int> Numbers { get; set; } = [];
        /// <summary>Beklenen nakit: teslimdeki nakit siparişlerin toplamı.</summary>
        public decimal ExpectedCash { get; set; }
        public decimal CardAmount { get; set; }
        /// <summary>Sayılan nakit; sayım yoksa (nakitsiz teslim ya da eski kayıt) null.</summary>
        public decimal? CountedCash { get; set; }
        /// <summary>Sayılan − beklenen; eksi = eksik.</summary>
        public decimal? CashDifference { get; set; }
    }
}
