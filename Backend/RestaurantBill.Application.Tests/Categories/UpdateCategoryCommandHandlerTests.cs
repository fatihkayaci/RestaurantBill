using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Categories;

public class UpdateCategoryCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly UpdateCategoryCommandHandler _handler;

    public UpdateCategoryCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new UpdateCategoryCommandHandler(_mockUow.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldRenameAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new UpdateCategoryCommand { Id = 1, Name = "Yeni İsim" };
        Category category = Category.Create("Eski İsim", 1);

        _mockUow.Setup(u => u.Category.GetByIdAsync(command.Id, true))
                .ReturnsAsync(category);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        Assert.Equal("Yeni İsim", category.Name);
        _mockUow.Verify(u => u.Category.UpdateAsync(category), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenIdIsZeroOrNegative_ShouldThrowNotFoundException(int invalidId)
    {
        // --- ARRANGE ---
        var command = new UpdateCategoryCommand { Id = invalidId, Name = "Test" };
        _mockUow.Setup(u => u.Category.GetByIdAsync(It.IsAny<int>(), It.IsAny<bool>()))
                .ReturnsAsync((Category?)null);

        // --- ACT & ASSERT ---
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_WhenCategoryNotFound_ShouldThrowNotFoundException()
    {
        // --- ARRANGE ---
        var command = new UpdateCategoryCommand { Id = 999, Name = "Test" };

        _mockUow.Setup(u => u.Category.GetByIdAsync(command.Id, true))
                .ReturnsAsync((Category?)null);

        // --- ACT & ASSERT ---
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
