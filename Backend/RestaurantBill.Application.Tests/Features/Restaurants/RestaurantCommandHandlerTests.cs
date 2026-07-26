using RestaurantBill.Application.Features.Restaurants.Commands.UpdateRestaurant;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Restaurants;

public class RestaurantCommandHandlerTests
{
    public class UpdateRestaurantHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingRestaurant_UpdatesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Restaurant restaurant = Restaurant.Create();
            typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(restaurant, 1);
            await uow.RestaurantRepo.AddAsync(restaurant);

            var handler = new UpdateRestaurantCommandHandler(uow, new FakeCurrentUserService { RestaurantId = 1 });
            var command = new UpdateRestaurantCommand
            {
                Name = "Yeni Restoran",
                PhoneNumber = "05001234567",
                Email = "info@restoran.com",
                City = "İstanbul",
                District = "Kadıköy"
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni Restoran", restaurant.Name);
            Assert.Equal("İstanbul", restaurant.City);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingRestaurant_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new UpdateRestaurantCommandHandler(uow, new FakeCurrentUserService());

            var result = await handler.Handle(new UpdateRestaurantCommand { Name = "Ad" }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
