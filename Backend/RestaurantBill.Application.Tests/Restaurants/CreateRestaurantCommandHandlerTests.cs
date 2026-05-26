using Moq;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Features.Restaurants.Commands.UpdateRestaurant;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Restaurants;

public class UpdateRestaurantCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly UpdateRestaurantCommandHandler _handler;

    public UpdateRestaurantCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(u => u.UserId).Returns("guid-042");

        _handler = new UpdateRestaurantCommandHandler(_mockUow.Object, _mockCurrentUser.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenRestaurantExists_ShouldUpdateAndSaveChanges()
    {
        UpdateRestaurantCommand command = new UpdateRestaurantCommand
        {
            Name = "Test Restoran",
            PhoneNumber = "02121234567",
            MobilePhoneNumber = "05551234567",
            Email = "test@restoran.com",
            City = "İstanbul",
            District = "Kadıköy"
        };
        Restaurant existingRestaurant = Restaurant.Create("guid-042");

        _mockUow.Setup(u => u.Restaurant.GetAllAsync(
                It.IsAny<Expression<Func<Restaurant, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<string?>()))
                .ReturnsAsync(new List<Restaurant> { existingRestaurant });
        _mockUow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal("Test Restoran", existingRestaurant.Name);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenRestaurantNotFound_ShouldThrowNotFoundException()
    {
        UpdateRestaurantCommand command = new UpdateRestaurantCommand { Name = "Test" };

        _mockUow.Setup(u => u.Restaurant.GetAllAsync(
                It.IsAny<Expression<Func<Restaurant, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<string?>()))
                .ReturnsAsync(new List<Restaurant>());

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
