using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Fakes;

public static class TestActor
{
    public static User Seed(FakeUnitOfWork uow, Guid userId, string fullName = "Test Kullanıcı")
    {
        User user = User.Create(fullName, "test@test.com", "5551234567");
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(user, userId);
        uow.UserRepo.AddAsync(user).GetAwaiter().GetResult();
        return user;
    }
}
