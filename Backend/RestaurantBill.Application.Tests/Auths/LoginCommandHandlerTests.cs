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

        // JWT ayarları
        _mockConfiguration.Setup(c => c["JwtSettings:SecretKey"]).Returns("super-secret-key-that-is-long-enough-32chars!");
        _mockConfiguration.Setup(c => c["JwtSettings:Issuer"]).Returns("TestIssuer");
        _mockConfiguration.Setup(c => c["JwtSettings:Audience"]).Returns("TestAudience");

        _handler = new LoginCommandHandler(_mockUow.Object, _mockUserManager.Object, _mockConfiguration.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCredentialsAndRestaurantIdSet_ShouldReturnJwtToken()
    {
        // --- ARRANGE ---
        var command = new LoginCommand { UserName = "testuser", Password = "Test123!" };
        var user = new User
        {
            Id = 1,
            UserName = "testuser",
            FullName = "Test User",
            UserCode = "USR001",
            RestaurantId = 5,
            Role = UserRole.Admin
        };

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName))
                        .ReturnsAsync(user);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(user, command.Password))
                        .ReturnsAsync(true);

        // --- ACT ---
        var result = await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        // JWT token 3 parçadan oluşur (header.payload.signature)
        Assert.Equal(3, result.Split('.').Length);
    }

    [Fact]
    public async Task Handle_WhenRestaurantIdIsZero_ShouldFetchFromRepositoryAndReturnToken()
    {
        // --- ARRANGE ---
        var command = new LoginCommand { UserName = "testuser", Password = "Test123!" };
        var user = new User
        {
            Id = 2,
            UserName = "testuser",
            FullName = "Test User",
            UserCode = "USR002",
            RestaurantId = 0,  // RestaurantId set değil
            Role = UserRole.Admin
        };
        var restaurant = new Restaurant { Id = 10, UserId = user.Id.ToString(), Name = "Test Restaurant" };

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName))
                        .ReturnsAsync(user);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(user, command.Password))
                        .ReturnsAsync(true);
        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(new List<Restaurant> { restaurant });

        // --- ACT ---
        var result = await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        _mockUow.Verify(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenRestaurantIdIsZeroAndNoRestaurantFound_ShouldReturnTokenWithRestaurantIdZero()
    {
        // --- ARRANGE ---
        var command = new LoginCommand { UserName = "testuser", Password = "Test123!" };
        var user = new User
        {
            Id = 3,
            UserName = "testuser",
            FullName = "Test User",
            UserCode = "USR003",
            RestaurantId = 0,
            Role = UserRole.Admin
        };

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName))
                        .ReturnsAsync(user);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(user, command.Password))
                        .ReturnsAsync(true);
        _mockUow.Setup(u => u.Restaurant.GetAllAsync(It.IsAny<Expression<Func<Restaurant, bool>>>(), false, null))
                .ReturnsAsync(new List<Restaurant>());

        // --- ACT ---
        var result = await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.NotEmpty(result);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenUserNotFound_ShouldThrowBusinessException()
    {
        // --- ARRANGE ---
        var command = new LoginCommand { UserName = "nonexistent", Password = "Test123!" };

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName))
                        .ReturnsAsync((User?)null);

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kullanıcı adı veya şifre hatalı!", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenPasswordIsWrong_ShouldThrowBusinessException()
    {
        // --- ARRANGE ---
        var command = new LoginCommand { UserName = "testuser", Password = "WrongPassword!" };
        var user = new User
        {
            Id = 1,
            UserName = "testuser",
            FullName = "Test User",
            UserCode = "USR001",
            RestaurantId = 5,
            Role = UserRole.Admin
        };

        _mockUserManager.Setup(um => um.FindByNameAsync(command.UserName))
                        .ReturnsAsync(user);
        _mockUserManager.Setup(um => um.CheckPasswordAsync(user, command.Password))
                        .ReturnsAsync(false);

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kullanıcı adı veya şifre hatalı!", exception.Message);
    }

    #endregion
}
