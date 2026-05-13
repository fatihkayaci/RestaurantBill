using Moq;
using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
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
    private readonly GetRestaurantByUserIdQueryHandler _handler;

    public GetRestaurantByUserIdHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(u => u.UserId).Returns("guid-042");
        _handler = new GetRestaurantByUserIdQueryHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenRestaurantExists_ShouldReturnMappedDto()
    {
        Restaurant restaurant = new() { Id = 1, Name = "Restoran A", UserId = "guid-042" };
        RestaurantDto expectedDto = new() { Name = "Restoran A" };

        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(new List<Restaurant> { restaurant });
        _mockMapper.Setup(m => m.Map<RestaurantDto>(restaurant))
                   .Returns(expectedDto);

        RestaurantDto result = await _handler.Handle(new GetRestaurantByUserIdQuery(), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("Restoran A", result.Name);
    }

    #endregion

    #region edge cases

    [Fact]
    public async Task Handle_WhenNoRestaurantExists_ShouldThrowNotFoundException()
    {
        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(new List<Restaurant>());

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(new GetRestaurantByUserIdQuery(), CancellationToken.None));
    }

    #endregion
}
