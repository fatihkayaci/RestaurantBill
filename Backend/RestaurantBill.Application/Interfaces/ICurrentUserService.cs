namespace RestaurantBill.Application.Interfaces;

public interface ICurrentUserService
{
    Guid BranchId { get; }
    Guid UserId { get; }
    string Role { get; }
}
