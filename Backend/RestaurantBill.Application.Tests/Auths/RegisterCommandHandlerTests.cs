using Moq;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Features.Auths.Commands.Register;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Auths;

public class RegisterCommandHandlerTests
{
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly RegisterCommandHandler _handler;

    public RegisterCommandHandlerTests()
    {
        var store = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        _mockUow = new Mock<IUnitOfWork>();
        _mockUow.Setup(u => u.Restaurant.AddAsync(It.IsAny<Restaurant>())).Returns(Task.CompletedTask);
        _mockUow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _mockUserManager.Setup(um => um.UpdateAsync(It.IsAny<User>())).ReturnsAsync(IdentityResult.Success);
        _handler = new RegisterCommandHandler(_mockUserManager.Object, _mockUow.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldCreateUserSuccessfully()
    {
        RegisterCommand command = new RegisterCommand
        {
            FullName = "Test User",
            UserName = "testuser",
            Email = "test@example.com",
            Password = "Test123!"
        };

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.Password))
                        .ReturnsAsync(IdentityResult.Success);

        await _handler.Handle(command, CancellationToken.None);

        _mockUserManager.Verify(um => um.CreateAsync(
            It.Is<User>(u =>
                u.FullName == command.FullName &&
                u.UserName == command.UserName &&
                u.Email == command.Email &&
                u.UserCode.StartsWith("USR-") &&
                u.Role == UserRole.Admin
            ),
            command.Password
        ), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldCreateRestaurantAndAssignId()
    {
        RegisterCommand command = new RegisterCommand
        {
            FullName = "Test User",
            UserName = "testuser",
            Email = "test@example.com",
            Password = "Test123!"
        };

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.Password))
                        .ReturnsAsync(IdentityResult.Success);

        await _handler.Handle(command, CancellationToken.None);

        _mockUow.Verify(u => u.Restaurant.AddAsync(It.IsAny<Restaurant>()), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _mockUserManager.Verify(um => um.UpdateAsync(It.IsAny<User>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenUserCreationFails_ShouldThrowBusinessException()
    {
        RegisterCommand command = new RegisterCommand
        {
            FullName = "Test User",
            UserName = "testuser",
            Email = "test@example.com",
            Password = "weak"
        };

        IdentityError[] identityErrors =
        [
            new IdentityError { Description = "Şifre çok kısa." },
            new IdentityError { Description = "Şifre özel karakter içermelidir." }
        ];

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.Password))
                        .ReturnsAsync(IdentityResult.Failed(identityErrors));

        BusinessException exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Contains("Kayıt başarısız:", exception.Message);
        Assert.Contains("Şifre çok kısa.", exception.Message);
        Assert.Contains("Şifre özel karakter içermelidir.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenDuplicateUserName_ShouldThrowBusinessException()
    {
        RegisterCommand command = new RegisterCommand
        {
            FullName = "Test User",
            UserName = "existinguser",
            Email = "test@example.com",
            Password = "Test123!"
        };

        IdentityError[] identityErrors =
        [
            new IdentityError { Description = "Bu kullanıcı adı zaten kullanılıyor." }
        ];

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.Password))
                        .ReturnsAsync(IdentityResult.Failed(identityErrors));

        BusinessException exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Contains("Kayıt başarısız:", exception.Message);
        Assert.Contains("Bu kullanıcı adı zaten kullanılıyor.", exception.Message);
    }

    #endregion
}
