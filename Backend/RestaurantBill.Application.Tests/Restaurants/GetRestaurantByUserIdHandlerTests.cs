using Moq;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;
using System.Security.Claims;

namespace RestaurantBill.Application.Tests.Restaurants;

public class GetRestaurantByUserIdHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly GetRestaurantByUserIdHandler _handler;

    public GetRestaurantByUserIdHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _handler = new GetRestaurantByUserIdHandler(_mockUow.Object, _mockMapper.Object, _mockHttpContextAccessor.Object);
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
    public async Task Handle_WhenRestaurantsExist_ShouldReturnMappedDtos()
    {
        // --- ARRANGE ---
        var userId = "42";
        SetupHttpContext(userId);

        var restaurants = new List<Restaurant>
        {
            new() { Id = 1, Name = "Restoran A", UserId = userId },
            new() { Id = 2, Name = "Restoran B", UserId = userId }
        };
        var expectedDtos = new List<RestaurantDto>
        {
            new() { Name = "Restoran A" },
            new() { Name = "Restoran B" }
        };

        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(restaurants);
        _mockMapper.Setup(m => m.Map<IEnumerable<RestaurantDto>>(restaurants))
                   .Returns(expectedDtos);

        // --- ACT ---
        var result = await _handler.Handle(new GetRestaurantByUserIdQuery(), CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task Handle_WhenNoRestaurantsExist_ShouldReturnEmptyList()
    {
        // --- ARRANGE ---
        SetupHttpContext("42");

        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(new List<Restaurant>());
        _mockMapper.Setup(m => m.Map<IEnumerable<RestaurantDto>>(It.IsAny<IEnumerable<Restaurant>>()))
                   .Returns(new List<RestaurantDto>());

        // --- ACT ---
        var result = await _handler.Handle(new GetRestaurantByUserIdQuery(), CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion
}
