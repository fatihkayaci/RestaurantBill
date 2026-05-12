using Moq;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Features.Restaurants.Commands.CreateRestaurant;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Restaurants;

public class CreateRestaurantCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly CreateRestaurantCommandHandler _handler;

    public CreateRestaurantCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(u => u.UserId).Returns("guid-042");

        var store = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _handler = new CreateRestaurantCommandHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object, _mockUserManager.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldCreateRestaurantWithUserIdAndSaveChanges()
    {
        var command = new CreateRestaurantCommand
        {
            Name = "Test Restoran",
            PhoneNumber = "02121234567",
            MobilePhoneNumber = "05551234567",
            Email = "test@restoran.com",
            City = "İstanbul",
            District = "Kadıköy"
        };
        var restaurant = new Restaurant { Name = "Test Restoran" };
        var user = new User { Id = "guid-042", FullName = "Test", UserCode = "USR001" };

        _mockMapper.Setup(m => m.Map<Restaurant>(command)).Returns(restaurant);
        _mockUow.Setup(u => u.Restaurant.AddAsync(It.IsAny<Restaurant>())).Returns(Task.CompletedTask);
        _mockUserManager.Setup(um => um.FindByIdAsync("guid-042")).ReturnsAsync(user);
        _mockUserManager.Setup(um => um.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal("guid-042", restaurant.UserId);
        _mockUow.Verify(u => u.Restaurant.AddAsync(restaurant), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion
}
