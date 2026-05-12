namespace RestaurantBill.Application.Interfaces;

public interface ICurrentUserService
{
    int RestaurantId { get; }
    string UserId { get; }
    string Role { get; }
}
