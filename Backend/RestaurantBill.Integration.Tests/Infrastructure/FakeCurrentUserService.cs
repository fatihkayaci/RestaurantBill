using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Integration.Tests.Infrastructure;

public class FakeCurrentUserService : ICurrentUserService
{
    public int RestaurantId { get; init; } = 1;
    public int UserId { get; init; } = 1;
    public string Role { get; init; } = "Admin";
}
