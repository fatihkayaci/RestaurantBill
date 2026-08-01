using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Integration.Tests.Infrastructure;

public class FakeCurrentUserService : ICurrentUserService
{
    public Guid BranchId { get; init; } = Guid.NewGuid();
    public Guid UserId { get; init; } = Guid.NewGuid();
    public string Role { get; init; } = "Admin";
}
