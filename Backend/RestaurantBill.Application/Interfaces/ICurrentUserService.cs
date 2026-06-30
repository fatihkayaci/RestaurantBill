namespace RestaurantBill.Application.Interfaces;

public interface ICurrentUserService
{
    int RestaurantId { get; }
    int UserId { get; }
    string Role { get; }
}
