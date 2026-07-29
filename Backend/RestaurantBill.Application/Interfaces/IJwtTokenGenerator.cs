using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user, int restaurantId, UserRole role, string userName);
    string GenerateTransitionToken(int userId);
}
