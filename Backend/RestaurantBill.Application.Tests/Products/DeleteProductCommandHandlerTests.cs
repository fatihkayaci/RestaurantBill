using Moq;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Products;

public class DeleteProductCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly DeleteProductCommandHandler _handler;

    public DeleteProductCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new DeleteProductCommandHandler(_mockUow.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidId_ShouldDeleteProductAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new DeleteProductCommand { Id = 1 };
        Product product = Product.Create("Lahmacun", 120m, true, "", 1, 1);

        _mockUow.Setup(u => u.Product.GetByIdAsync(command.Id, false))
                .ReturnsAsync(product);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockUow.Verify(u => u.Product.Delete(product), Times.Once);
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
        var command = new DeleteProductCommand { Id = invalidId };
        _mockUow.Setup(u => u.Product.GetByIdAsync(It.IsAny<int>(), It.IsAny<bool>()))
                .ReturnsAsync((Product?)null);

        // --- ACT & ASSERT ---
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_WhenProductNotFound_ShouldThrowNotFoundException()
    {
        // --- ARRANGE ---
        var command = new DeleteProductCommand { Id = 999 };

        _mockUow.Setup(u => u.Product.GetByIdAsync(command.Id, false))
                .ReturnsAsync((Product?)null);

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir ürün bulunamadı.", exception.Message);
    }

    #endregion
}
