using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeCurrentUserService : ICurrentUserService
{
    public int RestaurantId { get; init; } = 1;
    public int UserId { get; init; } = 1;
    public string Role { get; init; } = "Admin";
}
