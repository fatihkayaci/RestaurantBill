using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Interfaces;

public interface IJwtTokenGenerator
{
    // restaurantId: çalışan ve şube modundaki Owner için Branch.Id, "Tümü" modundaki Owner için Company.Id.
    // companyId her durumda şirket; frontend restaurantId == companyId ise "Tümü" modunda olduğunu anlar.
    string GenerateToken(User user, Guid restaurantId, UserRole role, string userName, Guid companyId);
    string GenerateTransitionToken(Guid userId, UserRole role);
}
