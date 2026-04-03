using Moq;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;
using System.Security.Claims;

namespace RestaurantBill.Application.Tests.Users;

public class GetUserByRestaurantIdCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly GetUserByRestaurantIdCommandHandler _handler;

    public GetUserByRestaurantIdCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _handler = new GetUserByRestaurantIdCommandHandler(_mockUow.Object, _mockMapper.Object, _mockHttpContextAccessor.Object);
    }

    private void SetupHttpContext(int restaurantId)
    {
        var claims = new List<Claim> { new("RestaurantId", restaurantId.ToString()) };
        var identity = new ClaimsIdentity(claims);
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(httpContext);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenUsersExist_ShouldReturnMappedDtos()
    {
        // --- ARRANGE ---
        SetupHttpContext(5);

        var users = new List<User>
        {
            new() { Id = 1, FullName = "Garson Ali", UserName = "ali", UserCode = "WTR001", RestaurantId = 5 },
            new() { Id = 2, FullName = "Garson Veli", UserName = "veli", UserCode = "WTR002", RestaurantId = 5 }
        };
        var expectedDtos = new List<UserDto>
        {
            new() { Id = 1, FullName = "Garson Ali", UserName = "ali", UserCode = "WTR001", PhoneNumber = "" },
            new() { Id = 2, FullName = "Garson Veli", UserName = "veli", UserCode = "WTR002", PhoneNumber = "" }
        };

        _mockUow.Setup(u => u.User.GetAllAsync(It.IsAny<Expression<Func<User, bool>>>(), false, null))
                .ReturnsAsync(users);
        _mockMapper.Setup(m => m.Map<IEnumerable<UserDto>>(users))
                   .Returns(expectedDtos);

        // --- ACT ---
        var result = await _handler.Handle(new GetUserByRestaurantIdCommand(), CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task Handle_WhenNoUsersExist_ShouldReturnEmptyList()
    {
        // --- ARRANGE ---
        SetupHttpContext(5);

        _mockUow.Setup(u => u.User.GetAllAsync(It.IsAny<Expression<Func<User, bool>>>(), false, null))
                .ReturnsAsync(new List<User>());
        _mockMapper.Setup(m => m.Map<IEnumerable<UserDto>>(It.IsAny<IEnumerable<User>>()))
                   .Returns(new List<UserDto>());

        // --- ACT ---
        var result = await _handler.Handle(new GetUserByRestaurantIdCommand(), CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenRestaurantIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidRestaurantId)
    {
        // --- ARRANGE ---
        SetupHttpContext(invalidRestaurantId);

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(new GetUserByRestaurantIdCommand(), CancellationToken.None));

        Assert.Equal("ID değeri 0 veya negatif olamaz.", exception.Message);
    }

    #endregion
}
