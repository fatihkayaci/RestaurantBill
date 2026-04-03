using Moq;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using RestaurantBill.Application.Features.Restaurants.Commands.CreateRestaurant;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Security.Claims;

namespace RestaurantBill.Application.Tests.Restaurants;

public class CreateRestaurantCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly CreateRestaurantCommandHandler _handler;

    public CreateRestaurantCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _handler = new CreateRestaurantCommandHandler(_mockUow.Object, _mockMapper.Object, _mockHttpContextAccessor.Object);
    }

    private void SetupHttpContext(string userId)
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims);
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(httpContext);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldCreateRestaurantWithUserIdAndSaveChanges()
    {
        // --- ARRANGE ---
        var userId = "42";
        SetupHttpContext(userId);

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

        _mockMapper.Setup(m => m.Map<Restaurant>(command)).Returns(restaurant);
        _mockUow.Setup(u => u.Restaurant.AddAsync(It.IsAny<Restaurant>())).Returns(Task.CompletedTask);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        Assert.Equal(userId, restaurant.UserId);
        _mockUow.Verify(u => u.Restaurant.AddAsync(restaurant), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion
}
