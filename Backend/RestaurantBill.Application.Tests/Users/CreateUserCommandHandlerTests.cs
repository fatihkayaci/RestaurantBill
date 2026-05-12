using Moq;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Users;

public class CreateUserCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly CreateUserCommandHandler _handler;

    public CreateUserCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();

        var store = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _handler = new CreateUserCommandHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object, _mockUserManager.Object);
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
        var user = new User { FullName = "Garson Ali", UserName = "garsonali", UserCode = "WTR001" };

        _mockMapper.Setup(m => m.Map<User>(command)).Returns(user);
        _mockUserManager.Setup(um => um.CreateAsync(user, command.PasswordHash))
                        .ReturnsAsync(IdentityResult.Success);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(5, user.RestaurantId);
        _mockUserManager.Verify(um => um.CreateAsync(user, command.PasswordHash), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenRestaurantIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidRestaurantId)
    {
        _mockCurrentUser.Setup(u => u.RestaurantId).Returns(invalidRestaurantId);

        var command = new CreateUserCommand
        {
            FullName = "Garson Ali",
            UserName = "garsonali",
            PhoneNumber = "05551234567",
            PasswordHash = "Test123!",
            UserCode = "WTR001"
        };
        var user = new User { FullName = "Garson Ali", UserName = "garsonali", UserCode = "WTR001" };

        _mockMapper.Setup(m => m.Map<User>(command)).Returns(user);

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("ID değeri 0 veya negatif olamaz.", exception.Message);
    }

    #endregion
}
