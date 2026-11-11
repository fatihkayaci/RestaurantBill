using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeJwtTokenGenerator : IJwtTokenGenerator
{
    public string GenerateToken(User user, Guid restaurantId, UserRole role, string userName, Guid companyId)
        => $"token:{user.Id}:{restaurantId}:{role}:{userName}:{companyId}";

    public string GenerateTransitionToken(Guid userId, UserRole role)
        => $"transition:{userId}:{role}";
}
