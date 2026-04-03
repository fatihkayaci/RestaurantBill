using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Users.Commands.DeleteUser;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Users;

public class DeleteUserCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly DeleteUserCommandHandler _handler;

    public DeleteUserCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new DeleteUserCommandHandler(_mockUow.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenUserExists_ShouldDeleteAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new DeleteUserCommand { UserId = 1 };
        var user = new User { Id = 1, FullName = "Garson Ali", UserName = "garsonali", UserCode = "WTR001" };

        _mockUow.Setup(u => u.User.GetByIdAsync(command.UserId, true))
                .ReturnsAsync(user);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockUow.Verify(u => u.User.Delete(user), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenUserNotFound_ShouldThrowNotFoundException()
    {
        // --- ARRANGE ---
        var command = new DeleteUserCommand { UserId = 999 };

        _mockUow.Setup(u => u.User.GetByIdAsync(command.UserId, true))
                .ReturnsAsync((User?)null);

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kullanıcı bulunamadı.", exception.Message);
    }

    #endregion
}
