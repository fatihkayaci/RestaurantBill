using Moq;
using AutoMapper;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Restaurants.Commands.UpdateRestaurant;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Restaurants;

public class UpdateRestaurantCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly UpdateRestaurantCommandHandler _handler;

    public UpdateRestaurantCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(u => u.UserId).Returns("guid-042");

        _handler = new UpdateRestaurantCommandHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object);
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
        Restaurant existingRestaurant = new Restaurant { Id = 1, UserId = "guid-042", Name = "" };

        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), true, null))
                .ReturnsAsync(new List<Restaurant> { existingRestaurant });
        _mockMapper.Setup(m => m.Map(command, existingRestaurant));
        _mockUow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        await _handler.Handle(command, CancellationToken.None);

        _mockMapper.Verify(m => m.Map(command, existingRestaurant), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenRestaurantNotFound_ShouldThrowNotFoundException()
    {
        UpdateRestaurantCommand command = new UpdateRestaurantCommand { Name = "Test" };

        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), true, null))
                .ReturnsAsync(new List<Restaurant>());

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
