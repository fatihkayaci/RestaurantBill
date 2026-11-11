namespace RestaurantBill.Application.Interfaces;

public interface ICurrentUserService
{
    // Şube modunda Branch.Id; Owner "Tümü" modundaysa Company.Id (RestaurantId claim'i ile aynı).
    Guid BranchId { get; }
    Guid CompanyId { get; }
    Guid UserId { get; }
    string Role { get; }
}
