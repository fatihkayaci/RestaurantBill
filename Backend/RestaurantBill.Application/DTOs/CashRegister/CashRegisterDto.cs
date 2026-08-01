using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class CashRegisterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public CashRegisterStatus Status { get; set; }
}
