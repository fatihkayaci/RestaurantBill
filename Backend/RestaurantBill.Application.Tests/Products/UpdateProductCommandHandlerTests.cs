using Moq;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Products;

public class UpdateProductCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly UpdateProductCommandHandler _handler;

    public UpdateProductCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new UpdateProductCommandHandler(_mockUow.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldUpdateProductAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new UpdateProductCommand { Id = 1, Name = "Güncellendi", Price = 150, IsActive = true, CategoryId = 2 };
        Product product = Product.Create("Eski", 100m, false, "", 1, 1);

        _mockUow.Setup(u => u.Product.GetByIdAsync(command.Id, true))
                .ReturnsAsync(product);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        Assert.Equal("Güncellendi", product.Name);
        Assert.Equal(150m, product.Price);
        Assert.True(product.IsActive);
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
        var command = new UpdateProductCommand { Id = invalidId, Name = "Test", Price = 100 };
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
        var command = new UpdateProductCommand { Id = 999, Name = "Test", Price = 100 };

        _mockUow.Setup(u => u.Product.GetByIdAsync(command.Id, true))
                .ReturnsAsync((Product?)null);

        // --- ACT & ASSERT ---
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
