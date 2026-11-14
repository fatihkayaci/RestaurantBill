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
    }

    /// <summary>"Teslim al" sonucu: kasaya geçen sipariş sayısı ve tutarlar.</summary>
    public class CourierHandoverResultDto
    {
        public int SettledCount { get; set; }
        public decimal CashAmount { get; set; }
        public decimal CardAmount { get; set; }
        public decimal Total => CashAmount + CardAmount;
    }
}
