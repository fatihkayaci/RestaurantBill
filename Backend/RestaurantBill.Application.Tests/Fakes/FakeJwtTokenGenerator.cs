using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeJwtTokenGenerator : IJwtTokenGenerator
{
    public string GenerateToken(User user, Guid restaurantId, UserRole role, string userName)
        => $"token:{user.Id}:{restaurantId}:{role}:{userName}";

    public string GenerateTransitionToken(Guid userId, UserRole role)
        => $"transition:{userId}:{role}";
}
