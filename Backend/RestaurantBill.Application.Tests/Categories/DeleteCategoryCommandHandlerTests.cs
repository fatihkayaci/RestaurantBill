using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Categories.Commands.DeleteCategory;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
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
        Category category = Category.Create("İçecekler", 1);

        _mockUow.Setup(u => u.Category.GetByIdAsync(
                It.IsAny<int>(),
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Category, object>>[]>()))
                .ReturnsAsync(category);
        _mockUow.Setup(u => u.Product.GetAllAsync(
                It.IsAny<Expression<Func<Product, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<string?>()))
                .ReturnsAsync(new List<Product>());

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockUow.Verify(u => u.Category.Delete(category), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenCategoryHasProducts_ShouldThrowDomainException()
    {
        // --- ARRANGE ---
        var command = new DeleteCategoryCommand { Id = 1 };
        Category category = Category.Create("İçecekler", 1);
        Product linkedProduct = Product.Create("Ürün", 10m, true, "", 1, 1);
        var linkedProducts = new List<Product> { linkedProduct };

        _mockUow.Setup(u => u.Category.GetByIdAsync(
                It.IsAny<int>(),
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Category, object>>[]>()))
                .ReturnsAsync(category);
        _mockUow.Setup(u => u.Product.GetAllAsync(
                It.IsAny<Expression<Func<Product, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<string?>()))
                .ReturnsAsync(linkedProducts);

        // --- ACT & ASSERT ---
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenCategoryNotFound_ShouldThrowNotFoundException()
    {
        // --- ARRANGE ---
        var command = new DeleteCategoryCommand { Id = 999 };

        _mockUow.Setup(u => u.Category.GetByIdAsync(
                It.IsAny<int>(),
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Category, object>>[]>()))
                .ReturnsAsync((Category?)null);

        // --- ACT & ASSERT ---
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
