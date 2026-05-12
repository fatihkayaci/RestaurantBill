using Moq;
using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Restaurants;

public class GetRestaurantByUserIdHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly GetRestaurantByUserIdHandler _handler;

    public GetRestaurantByUserIdHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(u => u.UserId).Returns("guid-042");
        _handler = new GetRestaurantByUserIdHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenRestaurantsExist_ShouldReturnMappedDtos()
    {
        var restaurants = new List<Restaurant>
        {
            new() { Id = 1, Name = "Restoran A", UserId = "guid-042" },
            new() { Id = 2, Name = "Restoran B", UserId = "guid-042" }
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

        var result = await _handler.Handle(new GetRestaurantByUserIdQuery(), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task Handle_WhenNoRestaurantsExist_ShouldReturnEmptyList()
    {
        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(new List<Restaurant>());
        _mockMapper.Setup(m => m.Map<IEnumerable<RestaurantDto>>(It.IsAny<IEnumerable<Restaurant>>()))
                   .Returns(new List<RestaurantDto>());

        var result = await _handler.Handle(new GetRestaurantByUserIdQuery(), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion
}
