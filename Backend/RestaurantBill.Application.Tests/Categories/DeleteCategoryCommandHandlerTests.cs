using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Categories.Commands.DeleteCategory;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Categories;

public class DeleteCategoryCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly DeleteCategoryCommandHandler _handler;

    public DeleteCategoryCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new DeleteCategoryCommandHandler(_mockUow.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidId_ShouldDeleteCategoryAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new DeleteCategoryCommand { Id = 1 };
        var category = new Category { Id = 1, Name = "İçecekler" };

        _mockUow.Setup(u => u.Category.GetByIdAsync(command.Id, false))
                .ReturnsAsync(category);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockUow.Verify(u => u.Category.Delete(category), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidId)
    {
        // --- ARRANGE ---
        var command = new DeleteCategoryCommand { Id = invalidId };

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kategori ID değeri 0 veya negatif olamaz.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenCategoryNotFound_ShouldThrowNotFoundException()
    {
        // --- ARRANGE ---
        var command = new DeleteCategoryCommand { Id = 999 };

        _mockUow.Setup(u => u.Category.GetByIdAsync(command.Id, false))
                .ReturnsAsync((Category?)null);

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir kategori bulunamadı", exception.Message);
    }

    #endregion
}
