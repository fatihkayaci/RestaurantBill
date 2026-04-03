using Moq;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Security.Claims;

namespace RestaurantBill.Application.Tests.Users;

public class CreateUserCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly CreateUserCommandHandler _handler;

    public CreateUserCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();

        var store = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _handler = new CreateUserCommandHandler(_mockUow.Object, _mockMapper.Object, _mockHttpContextAccessor.Object, _mockUserManager.Object);
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
    public async Task Handle_WhenValidCommand_ShouldCreateUserWithRestaurantIdAndSaveChanges()
    {
        // --- ARRANGE ---
        SetupHttpContext(5);

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

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
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
        // --- ARRANGE ---
        SetupHttpContext(invalidRestaurantId);

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

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("ID değeri 0 veya negatif olamaz.", exception.Message);
    }

    #endregion
}
