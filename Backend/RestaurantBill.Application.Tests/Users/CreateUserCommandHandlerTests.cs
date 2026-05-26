using Moq;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Users;

public class CreateUserCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly CreateUserCommandHandler _handler;

    public CreateUserCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockCurrentUser = new Mock<ICurrentUserService>();

        var store = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _handler = new CreateUserCommandHandler(_mockUow.Object, _mockCurrentUser.Object, _mockUserManager.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldCreateUserWithRestaurantIdAndSaveChanges()
    {
        _mockCurrentUser.Setup(u => u.RestaurantId).Returns(5);

        var command = new CreateUserCommand
        {
            FullName = "Garson Ali",
            UserName = "garsonali",
            PhoneNumber = "05551234567",
            PasswordHash = "Test123!",
            UserCode = "WTR001"
        };

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.PasswordHash))
                        .ReturnsAsync(IdentityResult.Success);

        await _handler.Handle(command, CancellationToken.None);

        _mockUserManager.Verify(um => um.CreateAsync(
            It.Is<User>(u =>
                u.FullName == "Garson Ali" &&
                u.UserName == "garsonali" &&
                u.RestaurantId == 5),
            command.PasswordHash), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenRestaurantIdIsZeroOrNegative_ShouldStillCreateUser(int restaurantId)
    {
        // The handler does not validate restaurantId; User.Create accepts any value.
        _mockCurrentUser.Setup(u => u.RestaurantId).Returns(restaurantId);

        var command = new CreateUserCommand
        {
            FullName = "Garson Ali",
            UserName = "garsonali",
            PhoneNumber = "05551234567",
            PasswordHash = "Test123!",
            UserCode = "WTR001"
        };

        _mockUserManager.Setup(um => um.CreateAsync(It.IsAny<User>(), command.PasswordHash))
                        .ReturnsAsync(IdentityResult.Success);

        // Should not throw; handler delegates validation to identity/domain
        await _handler.Handle(command, CancellationToken.None);

        _mockUserManager.Verify(um => um.CreateAsync(It.IsAny<User>(), command.PasswordHash), Times.Once);
    }

    #endregion
}
