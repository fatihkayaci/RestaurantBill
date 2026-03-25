using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class ChangeTableStatusDto 
{
    public TableStatus Status { get; set; }
}