using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs.Stats;

// Şube Genel Bakış'ı: kartların hepsi tek istekte gelir. "Bugün" şubenin kendi saat dilimindeki gündür.
public class DashboardDto
{
    public DateTime GeneratedAt { get; set; }
    public DashboardRevenueDto Revenue { get; set; } = new();
    public DashboardLiveDto Live { get; set; } = new();
    public DashboardPendingDto Pending { get; set; } = new();
    public List<DashboardRegionDto> Regions { get; set; } = [];
    /// <summary>Şubenin yerel saatine göre 24 dilim (0–23).</summary>
    public List<DashboardHourDto> Hourly { get; set; } = [];
    public List<DashboardReservationDto> Reservations { get; set; } = [];
    public List<DashboardTopProductDto> TopToday { get; set; } = [];
    public List<DashboardTopProductDto> TopWeek { get; set; } = [];
    /// <summary>Hazırlanma süresini aşmış, hâlâ hazır olmayan kalemler; en çok geciken önce.</summary>
    public List<OverdueOrderItemDto> Overdue { get; set; } = [];
}

public class DashboardRevenueDto
{
    public decimal Today { get; set; }
    public decimal Cash { get; set; }
    public decimal Card { get; set; }
    public decimal Other { get; set; }
    /// <summary>Dün gün başından şu anki saate kadar.</summary>
    public decimal SameTimeYesterday { get; set; }
    /// <summary>Dün bu saatte 0 ise tanımsız: null.</summary>
    public decimal? ChangePercent { get; set; }
    public int ClosedBills { get; set; }
    public decimal AvgBill { get; set; }
}

public class DashboardLiveDto
{
    public int OccupiedTables { get; set; }
    public int TotalTables { get; set; }
    public int OpenOrders { get; set; }
    /// <summary>Mutfakta bekleyen ya da hazırlanan kalemi olan sipariş sayısı.</summary>
    public int KitchenPending { get; set; }
    public string? LongestOpenTableName { get; set; }
    public DateTime? LongestOpenSince { get; set; }
}

public class DashboardPendingDto
{
    public int OrderRequests { get; set; }
    public DateTime? OldestOrderRequestAt { get; set; }
    public List<string> OrderRequestTables { get; set; } = [];
    public int ReservationRequests { get; set; }
    /// <summary>"14 Kas 19:00" biçiminde, en yakın üç istek.</summary>
    public List<string> ReservationRequestTimes { get; set; } = [];
    public int UncountedShifts { get; set; }
    public List<string> UncountedRegisters { get; set; } = [];
}

public class DashboardRegionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DashboardTableDto> Tables { get; set; } = [];
}

public class DashboardTableDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public TableStatus Status { get; set; }
    public DateTime? OccupiedSince { get; set; }
    public decimal ActiveOrderTotal { get; set; }
    /// <summary>Bugünkü en yakın rezervasyon, yerel "HH:mm".</summary>
    public string? NextReservationTime { get; set; }
    public string? NextReservationGuest { get; set; }
}

public class DashboardHourDto
{
    public int Hour { get; set; }
    public decimal Today { get; set; }
    public decimal LastWeek { get; set; }
}

public class DashboardReservationDto
{
    public Guid Id { get; set; }
    /// <summary>Yerel "HH:mm".</summary>
    public string Time { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public int PartySize { get; set; }
    public string TableName { get; set; } = string.Empty;
    public ReservationStatus Status { get; set; }
}

public class DashboardTopProductDto
{
    public string Name { get; set; } = string.Empty;
    public int Sold { get; set; }
    public decimal Revenue { get; set; }
}
