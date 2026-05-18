using Moq;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Auths.Commands.Login;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Enums;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Auths;

public class LoginCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly LoginCommandHandler _handler;

    public LoginCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();

        var store = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _mockConfiguration = new Mock<IConfiguration>();

        _mockConfiguration.Setup(c => c["JwtSettings:SecretKey"]).Returns("super-secret-key-that-is-long-enough-32chars!");
        _mockConfiguration.Setup(c => c["JwtSettings:Issuer"]).Returns("TestIssuer");
        _mockConfiguration.Setup(c => c["JwtSettings:Audience"]).Returns("TestAudience");

        _handler = new LoginCommandHandler(_mockUow.Object, _mockUserManager.Object, _mockConfiguration.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCredentialsAndRestaurantIdSet_ShouldReturnJwtToken()
    {
        var command = new LoginCommand { UserName = "testuser", Password = "Test123!" };
        User user = User.Create("Test User", "testuser", null, null, "USR001", UserRole.Admin, 5);
        user.Id = "guid-001";

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName)).ReturnsAsync(user);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(user, command.Password)).ReturnsAsync(true);

        var result = await _handler.Handle(command, CancellationToken.None);

        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Equal(3, result.Split('.').Length);
    }

    [Fact]
    public async Task Handle_WhenRestaurantIdIsZero_ShouldFetchFromRepositoryAndReturnToken()
    {
        var command = new LoginCommand { UserName = "testuser", Password = "Test123!" };
        User user = User.Create("Test User", "testuser", null, null, "USR002", UserRole.Admin, 0);
        user.Id = "guid-002";

        Restaurant restaurant = Restaurant.Create(user.Id);

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName)).ReturnsAsync(user);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(user, command.Password)).ReturnsAsync(true);
        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(new List<Restaurant> { restaurant });

        var result = await _handler.Handle(command, CancellationToken.None);

        Assert.NotNull(result);
        Assert.NotEmpty(result);
        _mockUow.Verify(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenRestaurantIdIsZeroAndNoRestaurantFound_ShouldReturnTokenWithRestaurantIdZero()
    {
        var command = new LoginCommand { UserName = "testuser", Password = "Test123!" };
        User user = User.Create("Test User", "testuser", null, null, "USR003", UserRole.Admin, 0);
        user.Id = "guid-003";

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName)).ReturnsAsync(user);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(user, command.Password)).ReturnsAsync(true);
        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(new List<Restaurant>());

        var result = await _handler.Handle(command, CancellationToken.None);

        Assert.NotNull(result);
        Assert.NotEmpty(result);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenUserNotFound_ShouldThrowBusinessException()
    {
        var command = new LoginCommand { UserName = "nonexistent", Password = "Test123!" };

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName)).ReturnsAsync((User?)null);

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kullanıcı adı, email veya şifre hatalı!", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenPasswordIsWrong_ShouldThrowBusinessException()
    {
        var command = new LoginCommand { UserName = "testuser", Password = "WrongPassword!" };
        User user = User.Create("Test User", "testuser", null, null, "USR001", UserRole.Admin, 5);
        user.Id = "guid-001";

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName)).ReturnsAsync(user);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(user, command.Password)).ReturnsAsync(false);

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kullanıcı adı, email veya şifre hatalı!", exception.Message);
    }

    #endregion
}
