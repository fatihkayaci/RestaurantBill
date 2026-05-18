using Moq;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Users.Commands.DeleteUser;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Users;

public class DeleteUserCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IUserRepository> _mockUserRepo;
    private readonly Mock<UserManager<User>> _mockUserManager;
    private readonly DeleteUserCommandHandler _handler;

    public DeleteUserCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockUserRepo = new Mock<IUserRepository>();
        _mockUow.Setup(u => u.User).Returns(_mockUserRepo.Object);

        var store = new Mock<IUserStore<User>>();
        _mockUserManager = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        _handler = new DeleteUserCommandHandler(_mockUow.Object, _mockUserManager.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenUserExists_ShouldDeleteAndSaveChanges()
    {
        var command = new DeleteUserCommand { UserId = "guid-001" };
        User user = User.Create("Garson Ali", "garsonali", null, null, "WTR001", UserRole.Waiter, 1);
        user.Id = "guid-001";

        _mockUserManager.Setup(um => um.FindByIdAsync(command.UserId)).ReturnsAsync(user);

        await _handler.Handle(command, CancellationToken.None);

        _mockUserRepo.Verify(u => u.Delete(user), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenUserNotFound_ShouldThrowNotFoundException()
    {
        var command = new DeleteUserCommand { UserId = "guid-999" };

        _mockUserManager.Setup(um => um.FindByIdAsync(command.UserId)).ReturnsAsync((User?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kullanıcı bulunamadı.", exception.Message);
    }

    #endregion
}
