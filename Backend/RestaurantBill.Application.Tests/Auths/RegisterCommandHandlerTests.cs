using Moq;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Auths.Commands.Register;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Auths;

public class RegisterCommandHandlerTests
{
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly RegisterCommandHandler _handler;

    public RegisterCommandHandlerTests()
    {
        var store = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _mockConfiguration = new Mock<IConfiguration>();

        _handler = new RegisterCommandHandler(_mockUserManager.Object, _mockConfiguration.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldCreateUserSuccessfully()
    {
        // --- ARRANGE ---
        var command = new RegisterCommand
        {
            FullName = "Test User",
            UserName = "testuser",
            Email = "test@example.com",
            UserCode = "USR001",
            Password = "Test123!"
        };

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.Password))
                        .ReturnsAsync(IdentityResult.Success);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockUserManager.Verify(um => um.CreateAsync(
            It.Is<User>(u =>
                u.FullName == command.FullName &&
                u.UserName == command.UserName &&
                u.Email == command.Email &&
                u.UserCode == command.UserCode &&
                u.Role == UserRole.Admin
            ),
            command.Password
        ), Times.Once);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenUserCreationFails_ShouldThrowBusinessException()
    {
        // --- ARRANGE ---
        var command = new RegisterCommand
        {
            FullName = "Test User",
            UserName = "testuser",
            Email = "test@example.com",
            UserCode = "USR001",
            Password = "weak"
        };

        var identityErrors = new[]
        {
            new IdentityError { Description = "Şifre çok kısa." },
            new IdentityError { Description = "Şifre özel karakter içermelidir." }
        };

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.Password))
                        .ReturnsAsync(IdentityResult.Failed(identityErrors));

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Contains("Kayıt başarısız:", exception.Message);
        Assert.Contains("Şifre çok kısa.", exception.Message);
        Assert.Contains("Şifre özel karakter içermelidir.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenDuplicateUserName_ShouldThrowBusinessException()
    {
        // --- ARRANGE ---
        var command = new RegisterCommand
        {
            FullName = "Test User",
            UserName = "existinguser",
            Email = "test@example.com",
            UserCode = "USR001",
            Password = "Test123!"
        };

        var identityErrors = new[]
        {
            new IdentityError { Description = "Bu kullanıcı adı zaten kullanılıyor." }
        };

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.Password))
                        .ReturnsAsync(IdentityResult.Failed(identityErrors));

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Contains("Kayıt başarısız:", exception.Message);
        Assert.Contains("Bu kullanıcı adı zaten kullanılıyor.", exception.Message);
    }

    #endregion
}
