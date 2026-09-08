using RestaurantBill.Application.DTOs.Stats;

namespace RestaurantBill.Application.DTOs.Reports;

public class StaffReportDto
{
    /// <summary>Garson bazlı: Order.CreatedUser üzerinden — açtığı sipariş sayısı, toplam ciro, ortalama sepet.</summary>
    public List<WaiterStaffRowDto> Waiters { get; set; } = [];

    /// <summary>Kasiyer bazlı: Payment.UserId üzerinden — tahsil ettiği tutar, işlem sayısı, yöntem kırılımı.</summary>
    public List<CashierStaffRowDto> Cashiers { get; set; } = [];
}

public class WaiterStaffRowDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public decimal Revenue { get; set; }
    public decimal AvgBasket { get; set; }
}

public class CashierStaffRowDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int TransactionCount { get; set; }
    public decimal Revenue { get; set; }
    public List<PaymentMethodBreakdownDto> PaymentMethods { get; set; } = [];
}
